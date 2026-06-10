# Sharent — Testing Strategy & Execution Plan

A three-layer test strategy: **backend integration** (real HTTP + real Mongoose
against an in-memory Mongo), **frontend unit/component** (the consolidated
generic building blocks), and a **manual E2E smoke checklist** for the browser.

| Layer | Tooling | Location | Run from |
|-------|---------|----------|----------|
| 1. Backend integration | Jest + Supertest + mongodb-memory-server | `server/tests/` | `server/` |
| 2. Frontend unit/component | Vitest + React Testing Library + jsdom | `client/src/**/__tests__/` | `client/` |
| 3. Manual E2E smoke | Human + browser | this file (§3) | — |

> **Why Vitest (not Jest) on the frontend?** The client is a Vite + React 19 ESM
> app. Jest needs Babel/ESM transforms and extra config to handle JSX + ESM;
> Vitest is the Vite-native runner, reuses `vite.config.js`, and exposes a
> **Jest-identical API** (`describe / it / expect`, with `vi` in place of `jest`).
> The test code below is otherwise the same you'd write under Jest.

---

## 1. Backend Integration Tests (Node / Express / Mongoose)

### 1.1 What changed to make this testable
`server/index.js` used to build the app **and** immediately `start()` it
(connect Mongo, open the socket, listen) at import time — so Supertest couldn't
import it. The Express app is now in **`server/app.js`** (pure, no side effects)
and `index.js` consumes it to add socket.io + Mongo + cron + `listen()`.
Production behaviour is unchanged (`req.io` is still injected — see `app.js`).

### 1.2 Install & run
```bash
cd server
npm install            # pulls jest, supertest, mongodb-memory-server (added to devDeps)
npm test               # run all suites
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```
> First run downloads the in-memory MongoDB binary (~one-time, cached). No local
> Mongo or `.env` is required — `tests/setup.js` supplies `JWT_SECRET` and boots a
> throwaway database that is wiped between every test.

### 1.3 Coverage map
- **`tests/auth.test.js`** — register (success, 400 validation matrix, 409 dup,
  role can't be self-granted), login (200, 401 wrong/unknown, 403 disabled, 400
  missing), `GET /me` JWT boundaries (valid 200 / missing 401 / malformed 403 /
  **expired 403**), password change (success round-trip + 400 wrong current).
- **`tests/items.test.js`** — public list shape & `isActive`/`isDeleted` filtering
  + category filter + location privacy; create (401 no token, 201, 400 unknown
  category, 400 missing field); read (200 / 404 unknown / **400 CastError** /
  404 soft-deleted); update ownership (owner 200, stranger **403**, admin 200);
  delete (soft-delete 200, **400 when active booking exists**, stranger 403);
  `/mine` scoping.
- **`tests/bookings.test.js`** — auth gate (401), creation with **server-side
  money split** (total / 10% fee / owner earnings, client amounts ignored),
  negative cases (400 missing, 400 bad dates, 400 own item, 404 inactive, **409
  overlap**), role-based status transitions (owner APPROVE, renter can only
  CANCEL → 403 on APPROVE, non-participant 403, admin COMPLETE bumps the renter's
  `completedTransactions` + recomputes `trustScore`), `/mine` vs `/incoming`.

### 1.4 Conventions
- `tests/helpers.js` provides `createUser` / `createAdmin` / `tokenFor` /
  `expiredTokenFor` / `seedCategory` / `createItem`.
- `emailService` is stubbed per-suite with a factory mock so no SMTP is touched.
- The global error handler is exercised through real requests (e.g. Mongoose
  `ValidationError` → 400, `CastError` → 400, duplicate key → 409).

---

## 2. Frontend Unit & Component Tests (React)

### 2.1 Install & run
```bash
cd client
npm install            # pulls vitest, @testing-library/react, @testing-library/jest-dom, jsdom
npm test               # vitest run (CI mode)
npm run test:watch     # interactive watch
npm run test:coverage  # coverage report
```
> If `npm install` reports a peer-dependency conflict against the current Vite
> version, re-run with `npm install --legacy-peer-deps`.

### 2.2 Coverage map
- **`components/ui/__tests__/Modal.test.jsx`** — renders children; **backdrop
  click closes**; **click on the box does NOT close** (stopPropagation);
  **Esc closes**; `closeOnBackdrop=false` ignores the backdrop but still closes
  on Esc; `showClose` ✕ button closes; `role="dialog"` + `aria-modal`.
- **`components/ui/__tests__/FormInput.test.jsx`** — label + input render; prop
  forwarding (`type`/`name`/`placeholder`/`required`); controlled value/onChange.
- **`hooks/__tests__/useAuthForm.test.js`** — init + `handleChange`; **validation
  blocks submission and surfaces the message**; valid submit runs the handler
  with the form; a thrown handler error is surfaced and `loading` resets.
- **`hooks/__tests__/useAsyncAction.test.js`** — returns the result on success;
  **toggles `loading`** during flight; **catches errors gracefully** (message set,
  resolves `undefined`); `setError` clears.
- **`utils/__tests__/format.test.js`** — `fullName` (join, single-part,
  missing-person fallback, blank-parts fallback) plus `priceParts`/`priceText`/
  `distanceLabel` edge cases.

### 2.3 Setup files
- `vite.config.js` gained a `test` block (jsdom + globals + setup).
- `src/test/setup.js` registers jest-dom matchers and cleans up between tests.
- `eslint.config.js` got a test-files override (relaxes `rules-of-hooks` for the
  `renderHook(() => useX())` pattern), so `npm run lint` stays green.

---

## 3. Manual E2E Smoke Test (Browser)

**Prerequisites**
1. Mongo running, `server/.env` set (`MONGODB_URI`, `JWT_SECRET`, mail vars).
2. `cd server && npm run seed` (optional, for demo data), then `npm run dev`.
3. `cd client && npm run dev`; open the printed URL (e.g. http://localhost:5173).
4. Have **two accounts** ready: a regular user and a second user (to play
   owner ↔ renter), plus one **ADMIN** account.

Tick each box; if "Actual" ≠ "Expected", file a bug with steps + screenshot.

### 3.1 Happy Path

**Auth**
- [ ] Register a new account → redirected in, navbar shows the user. 
- [ ] Log out, log back in with the same credentials → success.
- [ ] Profile (האזור האישי) → edit details (שם/טלפון/שכונה), save → "נשמרו בהצלחה"; refresh persists the real fields.
- [ ] Profile → change photo → pick a valid image → "שמירת תמונה" → avatar updates and survives refresh.
- [ ] Profile → change password → log out → log in with the new password.

**Listing an item**
- [ ] "פרסמו פריט" → fill title/description/category/daily rate, **upload a valid JPG/PNG** → submit → item page opens.
- [ ] New item appears in catalog (חיפוש) and on the home marquee.

**Discovery**
- [ ] Search → type a keyword → list narrows.
- [ ] Filter by a category checkbox → only that category shows.
- [ ] "קרוב אליי" → "use my location" (allow GPS) → results show "כ-X ק״מ ממך"; change radius re-queries.
- [ ] Set availability dates → unavailable items drop out.
- [ ] "טען פריטים נוספים" appends the next page.

**Booking (as the renter, on the *other* user's item)**
- [ ] Item page → "בצעו הזמנה" → pick a free date range → continue to checkout.
- [ ] Checkout shows the correct day count + total; "שלמו" → success page with order number.
- [ ] Profile → "ההשאלות שלי" shows the new PENDING booking.

**Booking lifecycle (as the owner)**
- [ ] Owner Profile → "בקשות שהתקבלו" shows the request → **Approve** → renter sees APPROVED.
- [ ] Owner marks **Returned/Completed** → both parties get a review invite.
- [ ] Submit a review (1–5★ + comment) from both sides → ratings/trust update on the profile.

**Admin (as ADMIN)**
- [ ] `/admin` loads KPIs, revenue chart, status donut, users table.
- [ ] Add a category → it appears immediately in the item form + search filters.
- [ ] Deactivate a (non-self) user → that user can no longer log in (403).

### 3.2 Edge Cases / Negative

**Auth & access control**
- [ ] Register with an existing email → clear "already registered" error, no double account.
- [ ] Register with password < 6 chars / invalid email → inline validation, **submit blocked**.
- [ ] Log in with a wrong password → error, not logged in.
- [ ] While **logged out**, visit `/profile`, `/checkout`, `/items/new`, `/admin` directly → redirected to login (no protected content flashes).
- [ ] As a **regular user**, visit `/admin` → blocked (not shown the dashboard).
- [ ] Let a session token expire (or tamper with it in localStorage) → next protected action cleanly bounces to login.

**Listings & uploads**
- [ ] Create item with an empty title / negative price → blocked with a message.
- [ ] **Upload an invalid file** (e.g. `.txt`, `.svg`, or a >5MB image) → rejected with "הקובץ גדול מדי…"/format error; no broken item created.
- [ ] Try to edit/delete **someone else's** item via its URL/API → 403, unchanged.
- [ ] Delete an item that has an approved/pending booking → blocked with the "resolve bookings first" message.

**Booking**
- [ ] Try to book **your own** item → prevented.
- [ ] Pick an end date before the start date → blocked.
- [ ] Book a range that **overlaps** an already-approved booking → "already booked" error (409).
- [ ] As the renter, try to **Approve** your own booking (e.g. via API) → 403; you can only **Cancel**.
- [ ] Open a booking you're not part of (guess an id) → 403/Not found.

**Reviews & forms**
- [ ] Open a review modal and **submit empty** (no rating) → blocked / validation shown.
- [ ] Click the modal **backdrop** and press **Esc** → modal closes; clicking inside the dialog does not.
- [ ] Submit the feedback/newsletter form with an invalid email → blocked.

**Resilience**
- [ ] Stop the backend, then trigger any fetch (search/profile) → a friendly error, not a blank page or crash (ErrorBoundary/empty states hold).
- [ ] Open an item page with a bad id (`/item/xxx`) → "הפריט לא נמצא" with a way back.

---

## 4. Suggested CI order
1. `cd server && npm test` (fast, hermetic).
2. `cd client && npm test`.
3. Manual §3 smoke before any release/merge to the protected branch.
