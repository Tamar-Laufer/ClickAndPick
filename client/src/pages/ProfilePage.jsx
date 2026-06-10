import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { apiFetch } from '../services/api';
import TgNavbar      from '../components/TgNavbar';
import BookingCard   from '../components/BookingCard';
import OwnerItemCard from '../components/OwnerItemCard';
import EditItemModal from '../components/EditItemModal';
import ReviewModal   from '../components/ReviewModal';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBoundary from '../components/ErrorBoundary';
import './ProfilePage.css';

/* ── Profile / personal area ──────────────────────────────────────────────
   The single "האזור האישי" for the app. Combines the ביחד profile design
   (header, trust meter, activity stats, editable details) with the full
   interactive functionality from the old dashboard: a tabbed manager for
   rentals / own items / incoming requests, booking actions (approve, reject,
   mark-returned, cancel), two-way reviews, and a password change.
   The four real profile fields persist via PUT /auth/profile; the extra design
   fields (neighbourhood, pickup address, bio) live in localStorage since the
   backend doesn't model them yet. */

const RING_C = 2 * Math.PI * 36; // circumference of the trust ring (r=36)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();

  /* profile details form. The four real fields come from the user; the extra
     local-only design fields (area/address/bio) are hydrated once, synchronously,
     from localStorage in the initializer (was a post-mount effect that caused an
     extra render). */
  const [form, setForm] = useState(() => {
    const base = {
      firstName: user?.firstName || '', lastName: user?.lastName || '',
      phone: user?.phone || '', area: '', address: '', bio: '',
    };
    try {
      const extra = JSON.parse(localStorage.getItem('yachad_profile_extra'));
      if (extra) return { ...base, ...extra };
    } catch { /* ignore malformed storage */ }
    return base;
  });
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  /* avatar — persisted independently of the details form.
     `avatar` is the saved photo shown on the page; `pendingFile`/`pendingPreview`
     hold a freshly-picked image that is NOT saved until the user confirms. */
  const [avatar, setAvatar] = useState(user?.avatarUrl || null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');

  /* password change */
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  /* live data */
  const [myItems, setMyItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [incoming, setIncoming] = useState([]);

  /* booking manager */
  // Deep links (/profile?tab=incoming|rentals|items) open the matching manager
  // tab directly. Read once from the URL in the initializer instead of syncing
  // via an effect.
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'rentals' || t === 'items' || t === 'incoming' ? t : 'rentals';
  });
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reviewing, setReviewing] = useState(null); // { booking, role }
  const [editingItem, setEditingItem] = useState(null); // item being edited, or null

  /* delete-item confirmation */
  const [deletingItem, setDeletingItem] = useState(null); // item pending delete confirmation, or null
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  /* full-bleed page — drop the global fixed-navbar spacing */
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  /* load the real items + bookings (server scopes each to the JWT user) */
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setListErr('');
    try {
      const [it, mine, inc] = await Promise.all([
        apiFetch('/items/mine', {}, token),
        apiFetch('/dashboard/my-rentals', {}, token),
        apiFetch('/dashboard/incoming-requests', {}, token),
      ]);
      setMyItems(it.items || []);
      setRentals(mine.bookings || []);
      setIncoming(inc.bookings || []);
    } catch (e) {
      setListErr(e.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount and whenever `load` (i.e. the token) changes. The setState
  // inside `load` is the necessary loading/data toggle of a data fetch, not a
  // synchronous render-loop, so the set-state-in-effect rule does not apply.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  /* Deep link from the "rate this loan" email
     (/profile?review=<bookingId>&as=renter|owner). The `as` side is set by the
     email so each recipient opens the right form: a renter rates the ITEM, an
     owner rates the RENTER. We look the booking up in the matching list only —
     never guess — so the wrong form can't open. The param is then stripped so
     it doesn't re-open on the next render. */
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewId = searchParams.get('review');
  const reviewAs = searchParams.get('as');

  // Reacts to the deep-link param once the booking lists have loaded: open the
  // correct review modal, then strip the param. This legitimately sets state in
  // response to fetched data arriving, so the rule is intentionally disabled.
  useEffect(() => {
    if (!reviewId || loading) return;
    // pick the role from the explicit `as`; fall back to detecting the side for
    // legacy links that don't carry it.
    const role = reviewAs === 'renter' || reviewAs === 'owner'
      ? reviewAs
      : (rentals.some(b => String(b.id) === String(reviewId)) ? 'renter' : 'owner');
    const list = role === 'renter' ? rentals : incoming;
    const match = list.find(b => String(b.id) === String(reviewId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setReviewing({ booking: match, role });
    setSearchParams({}, { replace: true });
  }, [reviewId, reviewAs, loading, rentals, incoming, setSearchParams]);

  /* PATCH /bookings/:id/status — the server re-verifies permission (403 if not allowed) */
  async function handleAction(id, status) {
    setBusyId(id); setListErr('');
    try {
      await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
      await load();
    } catch (e) {
      setListErr(e.message || 'הפעולה נכשלה');
    } finally {
      setBusyId(null);
    }
  }

  /* DELETE /items/:id — soft-delete on the server (blocked if the item has
     active/approved/pending bookings). On success drop it from local state so it
     disappears without a refetch; on failure surface the server's message. */
  async function confirmDelete() {
    if (!deletingItem) return;
    setDeleteBusy(true); setDeleteErr('');
    try {
      await apiFetch(`/items/${deletingItem.id}`, { method: 'DELETE' }, token);
      setMyItems(items => items.filter(it => it.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (e) {
      setDeleteErr(e.message || 'מחיקת הפריט נכשלה');
    } finally {
      setDeleteBusy(false);
    }
  }

  /* loan status of one of the user's own items, derived from its incoming bookings */
  function itemStatus(item) {
    const now = new Date();
    const bks = incoming.filter(b => String(b.item?.id || b.item) === String(item.id));
    if (bks.some(b => b.status === 'APPROVED' && new Date(b.startDate) <= now && now <= new Date(b.endDate)))
      return { label: 'מושאל כעת', cls: 'active' };
    const pending = bks.filter(b => b.status === 'PENDING').length;
    if (pending) return { label: `${pending} בקשות ממתינות`, cls: 'pending' };
    if (bks.some(b => b.status === 'APPROVED' && new Date(b.startDate) > now))
      return { label: 'מאושר להשאלה', cls: 'approved' };
    if (item.isActive === false) return { label: 'מוסתר', cls: 'cancelled' };
    return { label: 'זמין', cls: 'available' };
  }

  if (!user) return null;

  const name = `${form.firstName} ${form.lastName}`.trim() || user.name || 'הפרופיל שלי';
  const initial = (form.firstName || user.name || '?').trim()[0];
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    : null;

  const rating = Number(user.averageRenterRating) || 0;
  const reviewCount = Number(user.totalRenterReviews) || 0;
  // Composite Trust Score (0–100) computed server-side. Always present —
  // new members start at the baseline 50 (benefit of the doubt).
  const trustPct = Number.isFinite(Number(user.trustScore)) ? Number(user.trustScore) : 50;
  const isNewMember = reviewCount === 0 && Number(user.completedTransactions || 0) === 0;
  const ringOffset = RING_C * (1 - trustPct / 100);

  /* Trust Score breakdown — mirrors calculateTrustScore() on the server so the
     three contributing parts can be shown to the user. */
  const completedTx = Number(user.completedTransactions) || 0;
  const cancelledTx = Number(user.cancelledTransactions) || 0;
  const trustParts = [
    { key: 'quality', label: 'איכות הדירוג', value: Math.round((rating / 5) * 70), max: 70,
      hint: reviewCount > 0 ? `ממוצע ${rating.toFixed(1)}★` : 'אין ביקורות עדיין' },
    { key: 'volume', label: 'ניסיון בקהילה', value: Math.min(completedTx * 2, 20), max: 20,
      hint: `${completedTx} השאלות שהושלמו` },
    { key: 'reliability', label: 'אמינות', value: Math.max(0, 10 - cancelledTx * 2), max: 10,
      hint: cancelledTx > 0 ? `${cancelledTx} ביטולים אחרי אישור` : 'ללא ביטולים' },
  ];

  /* booking-manager tab data */
  const tabList = tab === 'rentals' ? rentals : tab === 'items' ? myItems : incoming;
  const tabRole = tab === 'rentals' ? 'renter' : 'owner';
  const EMPTY = {
    rentals:  { ic: '🧰', title: 'עוד לא שאלת פריטים', desc: 'מצאו פריט מהשכנים והזמינו אותו.', to: '/search', cta: 'לכל הפריטים' },
    items:    { ic: '📦', title: 'עוד לא פרסמת פריטים', desc: 'פרסמו פריט כדי ששכנים יוכלו לשאול אותו.', to: '/items/new', cta: 'פרסמו פריט' },
    incoming: { ic: '📥', title: 'אין עדיין בקשות לפריטים שלך', desc: 'כשמישהו יבקש לשאול פריט שלך — הבקשה תופיע כאן.', to: '/items/new', cta: 'פרסמו פריט' },
  }[tab];

  function field(id, v) { setForm(f => ({ ...f, [id]: v })); }

  async function toggleEdit() {
    if (!editing) { setEditing(true); setMsg(''); setErr(''); return; }
    // saving
    setSaving(true); setErr(''); setMsg('');
    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone }),
      }, token);
      updateUser(data.user);
      localStorage.setItem('yachad_profile_extra',
        JSON.stringify({ area: form.area, address: form.address, bio: form.bio }));
      setMsg('הפרטים נשמרו בהצלחה');
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pw.newPassword !== pw.confirm) { setPwErr('הסיסמאות החדשות אינן תואמות'); return; }
    setPwSaving(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      }, token);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg('הסיסמה עודכנה בהצלחה');
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setPwSaving(false);
    }
  }

  /* Profile photo — works independently of the details "edit" mode.
     Picking a file only stages a local PREVIEW; nothing is saved until the user
     confirms ("שמירת תמונה"). On confirm we upload to /uploads/image and PUT the
     URL to /auth/profile so it survives a refresh. "ביטול" discards the preview;
     "הסרת תמונה" clears the saved photo. */
  function pickAvatar(e) {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!f) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setAvatarErr('');
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  }

  function cancelAvatar() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setAvatarErr('');
  }

  async function saveAvatar() {
    if (!pendingFile) return;
    setAvatarBusy(true); setAvatarErr('');
    try {
      const fd = new FormData();
      fd.append('image', pendingFile);
      // raw fetch (not apiFetch) so the browser sets the multipart boundary itself
      const res = await fetch(`${API_BASE}/uploads/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const up = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(up.message || 'שגיאה בהעלאת התמונה');

      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: up.url }),
      }, token);
      updateUser(data.user);
      setAvatar(up.url);
      cancelAvatar(); // clear the staged preview now that it's saved
    } catch (err) {
      setAvatarErr(err.message || 'שמירת התמונה נכשלה');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true); setAvatarErr('');
    try {
      const data = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: '' }),
      }, token);
      updateUser(data.user);
      setAvatar(null);
    } catch (err) {
      setAvatarErr(err.message || 'הסרת התמונה נכשלה');
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="tg" dir="rtl">
      <TgNavbar variant="page" active="profile" />

      <main className="profile">
        <div className="wrap">

          {/* ── header ── */}
          <div className="prof-head">
            <div className="prof-photo-wrap">
              <div className="prof-photo">
                {(pendingPreview || avatar)
                  ? <img src={pendingPreview || avatar} alt={name} />
                  : <span className="ini">{initial}</span>}
                {avatarBusy && <span className="prof-photo-busy" aria-label="מעלה תמונה…">⏳</span>}
                {!pendingPreview && (
                  <button className="cam" type="button" aria-label="החלפת תמונה" disabled={avatarBusy}
                    onClick={() => document.getElementById('avatarFile').click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </button>
                )}
                <input type="file" id="avatarFile" accept="image/*" hidden onChange={pickAvatar} />
              </div>

              {pendingPreview ? (
                /* a new photo is staged — ask the user to confirm before saving */
                <div className="prof-photo-confirm">
                  <span className="ppc-q">לשמור את התמונה החדשה?</span>
                  <div className="ppc-btns">
                    <button type="button" className="btn btn-accent btn-sm" onClick={saveAvatar} disabled={avatarBusy}>
                      {avatarBusy ? 'שומר…' : 'שמירת תמונה'}
                    </button>
                    <button type="button" className="btn btn-line on-light btn-sm" onClick={cancelAvatar} disabled={avatarBusy}>
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                /* no staged photo — offer to change, and to remove an existing one */
                <div className="prof-photo-actions">
                  <button type="button" className="ppa-link" disabled={avatarBusy}
                    onClick={() => document.getElementById('avatarFile').click()}>
                    {avatar ? 'החלפת תמונה' : 'העלאת תמונה'}
                  </button>
                  {avatar && (
                    <button type="button" className="ppa-link danger" disabled={avatarBusy} onClick={removeAvatar}>
                      הסרת תמונה
                    </button>
                  )}
                </div>
              )}

              {avatarErr && <span className="prof-photo-err">{avatarErr}</span>}
            </div>

            <div className="prof-id">
              <div className="prof-name-row">
                <span className="prof-name">{name}</span>
                <span className="prof-verified">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16.6l.9-2.9-.9-2.9L5.6 9l1-2.8 3-.1z"/><path d="M16.5 9.5 11 15l-2.8-2.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  מאומת
                </span>
              </div>
              <div className="prof-loc">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{form.area || 'הוסיפו את השכונה שלכם'}</span>
              </div>
              <div className="prof-meta">
                {memberSince && (
                  <span className="mi">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    חבר/ה מאז {memberSince}
                  </span>
                )}
                <span className="mi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.1A8.38 8.38 0 1 1 21 11.5z"/></svg>
                  {user.email}
                </span>
              </div>
            </div>

          </div>

          <div className="prof-grid">

            {/* ── main column ── */}
            <div className="prof-main">

              {/* booking / item manager — full functionality from the old dashboard */}
              <div className="prof-card">
                <h3>ניהול ההשאלות והפריטים</h3>

                <div className="prof-tabs" role="tablist">
                  <button role="tab" className={tab === 'rentals' ? 'on' : ''} onClick={() => setTab('rentals')}>
                    ההשאלות שלי <span className="ptab-n">{rentals.length}</span>
                  </button>
                  <button role="tab" className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>
                    הפריטים שלי <span className="ptab-n">{myItems.length}</span>
                  </button>
                  <button role="tab" className={tab === 'incoming' ? 'on' : ''} onClick={() => setTab('incoming')}>
                    בקשות שהתקבלו <span className="ptab-n">{incoming.length}</span>
                  </button>
                </div>

                {loading && <p className="prof-loading">טוען…</p>}

                {!loading && listErr && (
                  <p className="pf-msg err">{listErr}<button type="button" onClick={load}>נסו שוב</button></p>
                )}

                {!loading && !listErr && tabList.length === 0 && (
                  <div className="prof-empty-box">
                    <div className="eb-ic">{EMPTY.ic}</div>
                    <p className="eb-title">{EMPTY.title}</p>
                    <p className="eb-desc">{EMPTY.desc}</p>
                    <Link className="btn btn-accent btn-sm" to={EMPTY.to}>{EMPTY.cta}</Link>
                  </div>
                )}

                {!loading && !listErr && tabList.length > 0 && (
                  <ErrorBoundary>
                    <div className="prof-bklist">
                      {tab === 'items'
                        ? myItems.map(it => (
                          <OwnerItemCard
                            key={it.id}
                            item={it}
                            status={itemStatus(it)}
                            onEdit={setEditingItem}
                            onDelete={(item) => { setDeleteErr(''); setDeletingItem(item); }}
                          />
                        ))
                        : tabList.map(b => (
                          <BookingCard
                            key={b.id}
                            booking={b}
                            role={tabRole}
                            busy={busyId === b.id}
                            onAction={handleAction}
                            onReview={(booking) => setReviewing({ booking, role: tabRole })}
                          />
                        ))}
                    </div>
                  </ErrorBoundary>
                )}
              </div>

              {/* personal details */}
              <div className="prof-card">
                <h3>פרטים אישיים
                  <button className={`btn btn-sm ${editing ? 'btn-accent' : 'btn-line on-light'}`}
                    type="button" onClick={toggleEdit} disabled={saving}>
                    {editing ? (saving ? 'שומר…' : 'שמירה') : 'עריכה'}
                  </button>
                </h3>

                {msg && <p className="pf-msg ok">{msg}</p>}
                {err && <p className="pf-msg err">{err}</p>}

                <form className={`prof-form${editing ? ' editing' : ''}`} onSubmit={e => e.preventDefault()}>
                  <div className="pf-grid2">
                    <div className="pf-field"><label>שם פרטי</label>
                      <input value={form.firstName} readOnly={!editing} onChange={e => field('firstName', e.target.value)} /></div>
                    <div className="pf-field"><label>שם משפחה</label>
                      <input value={form.lastName} readOnly={!editing} onChange={e => field('lastName', e.target.value)} /></div>
                  </div>
                  <div className="pf-field"><label>אימייל</label>
                    <input type="email" value={user.email} disabled /></div>
                  <div className="pf-grid2">
                    <div className="pf-field"><label>טלפון נייד</label>
                      <input type="tel" value={form.phone} readOnly={!editing} onChange={e => field('phone', e.target.value)} placeholder="050-0000000" /></div>
                    <div className="pf-field"><label>שכונה</label>
                      <input value={form.area} readOnly={!editing} onChange={e => field('area', e.target.value)} placeholder="פלורנטין, תל אביב" /></div>
                  </div>
                  <div className="pf-field"><label>כתובת לאיסוף</label>
                    <input value={form.address} readOnly={!editing} onChange={e => field('address', e.target.value)} placeholder="רחוב ומספר, דירה" /></div>
                  <div className="pf-field"><label>קצת עליי</label>
                    <textarea rows="3" value={form.bio} readOnly={!editing} onChange={e => field('bio', e.target.value)} placeholder="ספרו על עצמכם בכמה מילים…" /></div>
                </form>
              </div>

              {/* password change */}
              <div className="prof-card">
                <h3>שינוי סיסמה</h3>
                <form className="prof-form editing" onSubmit={savePassword}>
                  <div className="pf-field"><label>סיסמה נוכחית</label>
                    <input type="password" value={pw.currentPassword}
                      onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} required /></div>
                  <div className="pf-grid2">
                    <div className="pf-field"><label>סיסמה חדשה (לפחות 6 תווים)</label>
                      <input type="password" value={pw.newPassword} minLength={6} required
                        onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} /></div>
                    <div className="pf-field"><label>אימות סיסמה חדשה</label>
                      <input type="password" value={pw.confirm} minLength={6} required
                        onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} /></div>
                  </div>
                  {pwMsg && <p className="pf-msg ok">{pwMsg}</p>}
                  {pwErr && <p className="pf-msg err">{pwErr}</p>}
                  <button type="submit" className="btn btn-accent btn-sm" disabled={pwSaving}>
                    {pwSaving ? 'שומר…' : 'עדכון סיסמה'}
                  </button>
                </form>
              </div>

              {/* reviews about me */}
              <div className="prof-card">
                <h3>ביקורות עליי</h3>
                {reviewCount > 0 ? (
                  <div className="review">
                    <div className="review-top">
                      <span className="review-av">{initial}</span>
                      <span className="review-nm">דירוג ממוצע כשואל/ת</span>
                      <span className="review-stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
                    </div>
                    <p>{rating.toFixed(1)} מתוך 5 · מבוסס על {reviewCount} ביקורות שקיבלת מהקהילה.</p>
                  </div>
                ) : (
                  <p className="prof-empty">עוד אין ביקורות עליך — הן יופיעו כאן אחרי ההשאלות הראשונות.</p>
                )}
              </div>

            </div>

            {/* ── side column ── */}
            <aside className="prof-side">
              <div className="prof-card">
                <h3>מד האמון שלי</h3>
                <div className="trust-ring-wrap">
                  <div className="trust-ring">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="36" fill="none" stroke="var(--line)" strokeWidth="7" />
                      <circle className="arc" cx="44" cy="44" r="36" fill="none" stroke="var(--accent)" strokeWidth="7"
                        strokeLinecap="round" strokeDasharray={RING_C.toFixed(1)} strokeDashoffset={ringOffset.toFixed(1)}
                        transform="rotate(-90 44 44)" />
                    </svg>
                    <div className="trust-pct"><strong>{trustPct}</strong><span>מד אמון</span></div>
                  </div>
                  <div className="trust-copy">
                    <div className="tt">{isNewMember ? 'חבר/ה חדש/ה' : trustPct >= 80 ? 'חבר/ה מהימן/ה' : 'בונה אמון'}</div>
                    <div className="tc">
                      {reviewCount > 0
                        ? `דירוג ${rating.toFixed(1)} מתוך ${reviewCount} ביקורות.`
                        : 'השלימו השאלות כדי לבנות מוניטין בקהילה.'}
                    </div>
                  </div>
                </div>

                {/* how the score is built — the three weighted parts */}
                <ul className="trust-breakdown">
                  {trustParts.map(p => (
                    <li key={p.key}>
                      <div className="tb-row">
                        <span className="tb-label">{p.label}</span>
                        <span className="tb-val">{p.value}<small>/{p.max}</small></span>
                      </div>
                      <span className="tb-bar"><i style={{ '--tb-w': `${Math.round((p.value / p.max) * 100)}%` }} /></span>
                      <span className="tb-hint">{p.hint}</span>
                    </li>
                  ))}
                </ul>
                <p className="trust-foot">הציון (0–100) = איכות (עד 70) + ניסיון (2 נק' לכל השאלה, עד 20) + אמינות (עד 10).</p>

                <div className="vbadges">
                  <span className="vbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>אימייל מאומת</span>
                  <span className={`vbadge${user.phone ? '' : ' off'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={user.phone ? 'M20 6 9 17l-5-5' : 'M12 5v14M5 12h14'}/></svg>
                    טלפון מאומת
                  </span>
                  <span className="vbadge off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>ת״ז מאומתת</span>
                  <span className="vbadge off"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>אימות כתובת</span>
                </div>
              </div>

              <div className="prof-card">
                <h3>הפעילות שלי</h3>
                <div className="prof-stats">
                  <div className="prof-stat"><div className="n">{myItems.length}</div><div className="l">פריטים שיתפתי</div></div>
                  <div className="prof-stat"><div className="n">{rentals.length}</div><div className="l">פריטים ששאלתי</div></div>
                  <div className="prof-stat"><div className="n">{incoming.length}</div><div className="l">בקשות שקיבלתי</div></div>
                  <div className="prof-stat"><div className="n">{reviewCount > 0 ? rating.toFixed(1) : '—'}</div><div className="l">דירוג ממוצע</div></div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>

      {reviewing && (
        <ReviewModal
          booking={reviewing.booking}
          role={reviewing.role}
          onClose={() => setReviewing(null)}
          onSubmitted={load}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          token={token}
          onClose={() => setEditingItem(null)}
          /* patch the edited item in place so the list updates without a refetch */
          onSaved={(updated) => setMyItems(items => items.map(it => (it.id === updated.id ? updated : it)))}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          danger
          title="מחיקת פריט"
          message={`להסיר את "${deletingItem.title}"? לא ניתן לבטל את הפעולה.`}
          confirmLabel="מחיקה"
          busyLabel="מוחק…"
          cancelLabel="ביטול"
          busy={deleteBusy}
          error={deleteErr}
          onConfirm={confirmDelete}
          onCancel={() => { if (!deleteBusy) { setDeletingItem(null); setDeleteErr(''); } }}
        />
      )}

      <footer className="mini-footer">
        <div className="wrap">
          <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
          <span>© {new Date().getFullYear()} ביחד · שיתוף שכונתי</span>
        </div>
      </footer>
    </div>
  );
}
