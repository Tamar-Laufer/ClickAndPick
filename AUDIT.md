# Click & Pick — Zero-Waste Security & Clean Code Audit

**Scope:** full first-party codebase — `server/` (Node.js REST API), `database/`
(Mongoose data layer), `realtime-service-cpp/` (C++ native-WebSocket service),
and `client/` (React SPA).
**Checkpoint commit:** `50f8ba9` — *"backend: checkpoint verified server/database/realtime work"*
**Verification status:** server test suite **49/49 passing**; C++ service **compiles and links clean** (MSVC / Release).

---

## Executive summary

The codebase entered the audit in **strong shape**. Several issues the brief
anticipated — leftover Socket.IO boilerplate, leaked password hashes,
unprotected routes, path-traversal holes, inline HTML, stray debug prints —
were **verified absent** rather than fixed (see [Verified-clean pillars](#verified-clean-pillars)).

The audit's value therefore concentrated on a small set of **genuine** issues,
each confirmed by evidence (failing tests, compiler, or code path) rather than
assumed:

| # | Area | Finding | Status |
|---|------|---------|--------|
| 1 | Database | One regression (duplicate Mongoose instance broke the **entire** test suite) + 3 `.lean()` optimizations | ✅ Fixed, 49/49 green |
| 2 | C++ concurrency | `std::gmtime` data race + reconnect race in the connection registry | ✅ Fixed, compiles clean |
| 3 | Security | JWT header `alg` not validated (defense-in-depth) | ✅ Hardened |
| 4 | Client | Separation-of-Concerns / 0% inline styling | ✅ Verified clean |

---

## 1. Database optimization

### 1.1 `.lean()` on internal, multi-document reads

`.lean()` returns plain JS objects instead of full Mongoose documents, skipping
hydration, getters/setters and change tracking — a real win on read-only paths.

The developer had **already** applied `.lean()` everywhere it was both safe and
worthwhile (`categoriesService.listAll`, `messagesService.history`,
`itemsService.bookedDates`, `feedbackService.listApproved`). The audit added it
to three further **internal** read-only queries that are never serialized to the
client and never written back:

| Query | File |
|-------|------|
| `Item.find({ owner }).select('_id')` (incoming bookings) | [server/services/bookingsService.js](server/services/bookingsService.js) |
| `Booking.find({ … }).select('_id')` (expired-review cron) | [server/services/reviewsService.js](server/services/reviewsService.js) |
| `Review.find({ isPublic:false, … })` (expired-review cron) | [server/services/reviewsService.js](server/services/reviewsService.js) |

#### Why client-facing reads were deliberately left **non-lean**

A blanket `.lean()` pass would have been **actively harmful**. Each schema
defines a `toJSON` transform that (a) exposes an `id` virtual and deletes `_id`,
and — critically for `Item` — (b) **deletes the raw `location` coordinates** for
privacy:

```js
// database/models/Item.js
itemSchema.set('toJSON', {
  virtuals: true, versionKey: false,
  transform(_doc, ret) {
    delete ret._id;
    delete ret.location;   // owner's pickup coordinates never leave the server
    return ret;
  },
});
```

Adding `.lean()` to `itemsService.list` / `getById` / `listByOwner` (or the
review/booking list reads) would therefore have **(1)** broken the client's
`id` contract and **(2)** leaked owners' raw home coordinates into the public
catalog. These queries were intentionally preserved as full documents.

### 1.2 Mongoose de-duplication (structural regression fix)

**Symptom.** The test suite failed with **39/49 tests** erroring on
`MongooseError: Operation \`…insertOne()\` buffering timed out after 10000ms` —
every test that touched the database, uniformly.

**Root cause.** Extracting the data layer into a standalone `database/` package
created a **second, independent Mongoose installation**:

- `server/tests/setup.js` did `require('mongoose')` → resolved to
  `server/node_modules/mongoose` and connected **that** instance.
- The models (`database/models/*`) `require('mongoose')` → resolve, by Node's
  upward directory walk, to `database/node_modules/mongoose` — a **different**
  instance, which was never connected.

Mongoose buffers operations **per instance**, so every model write queued
against an unconnected instance and timed out. The failing stack trace
(`…/database/node_modules/mongoose/…`) confirmed operations ran on the database
copy.

**Why not a literal `peerDependency`.** `database/` and `server/` are **sibling
folders** coupled by relative-path `require('../../database/models')` — not an
npm dependency, with **no workspace root**. Node resolves `database`'s
`require('mongoose')` by walking **up** from `database/`; `server/node_modules`
is never on that path. A bare peer-dependency (deleting `database`'s copy so it
"falls through" to server's) cannot resolve under this layout — and would crash
production, since `database/db.js` (the live connector) is the rightful owner of
Mongoose. The correct de-duplication direction was therefore to remove
**server's** redundant copy, not database's.

**Fix.**

1. `database/db.js` now also **exports the shared Mongoose instance** the models
   are registered on:
   ```js
   module.exports = { connectMongo, disconnectMongo, mongoose };
   ```
2. `server/tests/setup.js` connects **that** instance instead of its own:
   ```js
   const { mongoose } = require('../../database/db');
   ```
3. The redundant `mongoose` dependency was **removed from `server/`** (`npm
   uninstall mongoose`), leaving exactly **one** install
   (`database/node_modules/mongoose`).

**Result.** Test suite restored to **49/49 passing**, validated *after* server's
Mongoose was physically removed — proving no server code secretly depended on a
second instance.

> **Forward-looking note (not changed):** the sibling-package layout (relative
> coupling, `database/db.js` reaching back into `server/utils/logger`, no
> workspace root) is what made this duplication possible. A root `package.json`
> with npm workspaces would prevent the entire class of issue. This is a
> structural decision left to the team, not an audit edit.

---

## 2. C++ concurrency hardening

File: [realtime-service-cpp/main.cpp](realtime-service-cpp/main.cpp). The service
runs Crow with `.multithreaded()`, so handlers execute on a **thread pool** —
making thread-safety correctness essential.

### 2.1 `std::gmtime` data race → `gmtime_s`

`utc_now_iso8601()` is called from the `.onmessage` handler (multi-threaded).
`std::gmtime` writes to a **shared internal static `tm` buffer**; concurrent
messages race on it and can emit corrupted timestamps.

```cpp
// before:  ss << std::put_time(std::gmtime(&tt), "%Y-%m-%dT%H:%M:%SZ");
std::tm tm{};
gmtime_s(&tm, &tt);                 // thread-safe; no shared static buffer
ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
```

### 2.2 Reconnect race in the connection registry

`Registry::remove` erased purely by user id. Because the client reconnects with
backoff, a stale socket's late `onclose` could **evict a newer, live connection**
that had already re-registered under the same uid — leaving the user wrongly
"offline" and bouncing their messages as `undelivered`.

```cpp
// only erase if the stored connection is the one actually closing
void remove(const std::string& uid, crow::websocket::connection* conn) {
    std::lock_guard<std::mutex> lk(mtx_);
    auto it = by_user_.find(uid);
    if (it != by_user_.end() && it->second == conn) by_user_.erase(it);
}
```

The `.onclose` handler now passes the closing connection: `registry.remove(*uid_ptr, &conn);`.

> **Deliberately *not* "optimized":** `deliver()` holds the registry mutex across
> `send_text()`. This is correct — it prevents a use-after-free where a
> connection is destroyed mid-send. Releasing the lock before sending would
> reintroduce that hazard, so it was left as-is.

---

## 3. Security layer — JWT algorithm validation

The C++ service verifies Node-issued JWTs with raw OpenSSL HMAC-SHA256. The audit
added explicit **header `alg` validation** as defense-in-depth against algorithm
confusion / `alg:none` downgrade attacks:

```cpp
// reject anything that doesn't explicitly declare HS256
const std::string header_str = base64url_decode(token.substr(0, d1));
try {
    const auto header = json::parse(header_str);
    if (!header.contains("alg") || header["alg"] != "HS256") return std::nullopt;
} catch (...) {
    return std::nullopt;
}
```

**Risk context (honest assessment):** the prior code was **not** exploitable —
it *only* ever computes an HMAC and compares, so `alg:none` (empty signature
fails the constant-time compare) and RS256→HS256 confusion (the secret is never
treated as a public key) both already failed safely. The existing verification
also remains sound on the fundamentals: HMAC-SHA256, **constant-time** signature
compare (`CRYPTO_memcmp`), `exp` expiry check, and `BIO_free_all` cleanup. The
`alg` check makes the algorithm contract **explicit** rather than implicit.

---

## 4. Client integrity — Separation of Concerns

The React client was audited for the Separation-of-Concerns and "no inline
HTML/CSS/DOM" pillars, plus React-specific correctness (hook dependencies,
redundant state, effect cleanup).

| Check | Method | Result |
|-------|--------|--------|
| Inline HTML / `innerHTML` / `dangerouslySetInnerHTML` / `document.write` | repo-wide grep | **0 occurrences** |
| Raw DOM string manipulation | repo-wide grep | none — styling lives in `.css` files |
| Redundant state mirroring props (`useState(props.x)`) | pattern scan | none — derived values used instead (`hasFilters`, `activeFilterCount`, `firstLoad` in `useItemSearch`) |
| Effect cleanup (timers / intervals / listeners / sockets) | all 6 sites read | **all clean**, including unmount paths |
| Hook dependency arrays & StrictMode safety | deep-read densest hooks | correct, with justified `exhaustive-deps` disables |

Representative evidence of disciplined SoC:

- [client/src/hooks/useWebSocketChat.js](client/src/hooks/useWebSocketChat.js) —
  StrictMode-safe `isCurrent()` guard, ref-to-avoid-reconnect, complete
  timer/socket teardown.
- [client/src/components/chat/chatWindow.jsx](client/src/components/chat/chatWindow.jsx) —
  recording `setInterval` cleared via `stopTracks()` from **every** exit path,
  including the unmount cleanup `useEffect(() => () => stopTracks(), [])`.

**Outcome:** **0% inline styling**, strict SoC upheld, no actionable React
findings. No client code was modified — consistent with the zero-waste
principle of not manufacturing churn.

> **Coverage note:** the client conclusion rests on repo-wide pattern scans plus
> deep reads of the highest-risk files (the data hooks and every
> timer/listener/socket site), not a line-by-line of all 37 files. The signal
> that the client matches the backend's quality is strong; a full sweep would be
> expected to surface, at most, cosmetic nits.

---

## Verified-clean pillars

These were **checked and found already satisfied** — no changes required:

- **Route protection** — every protected route uses `verifyToken`
  (router-level for bookings/dashboard/messages, per-route for
  items/auth/uploads, `checkRole('ADMIN')` for admin/categories).
- **Password safety** — `User.passwordHash` is `select: false` *and* stripped
  again in `toJSON`; login explicitly opts in with `.select('+passwordHash')`.
- **Path traversal** — audio streaming reduces the filename to `path.basename`,
  resolves it, and asserts `startsWith(AUDIO_DIR + path.sep)`; filenames are
  `crypto.randomBytes`, never user-derived; the audio directory is never
  `express.static`-exposed.
- **No Socket.IO residue** — none present in any `package.json` or source; chat
  is native `WebSocket` to the C++ Crow service.
- **No debug prints** — the only `console.*` calls are `import.meta.env.DEV`-gated
  or legitimate (`ErrorBoundary`); C++ `std::cout`/`std::cerr` are structured
  `[INFO]`/`[FATAL]` operational logs.
- **Input validation** — services whitelist fields (anti mass-assignment), take
  the acting user from the JWT (never the request body), and escape user input
  before building RegExps.

---

## Evidence & reproduction

```text
# Server test suite (from server/)
npm test
→ Test Suites: 3 passed, 3 total
→ Tests:       49 passed, 49 total

# C++ realtime service (incremental, Release)
cmake --build realtime-service-cpp/build --config Release --target realtime_service
→ realtime_service.vcxproj -> …/build/Release/realtime_service.exe   (exit 0)
```

**Changes landed in commit `50f8ba9`** (backend + realtime). Client files were
intentionally left uncommitted — the client pass produced no edits.
