import { Link } from 'react-router-dom';
import BookingCard from '../booking/BookingCard';
import OwnerItemCard from '../item/OwnerItemCard';
import ErrorBoundary from '../ui/ErrorBoundary';

/* per-tab empty state */
const EMPTY = {
  rentals:  { ic: '🧰', title: 'עוד לא שאלת פריטים', desc: 'מצאו פריט מהשכנים והזמינו אותו.', to: '/search', cta: 'לכל הפריטים' },
  items:    { ic: '📦', title: 'עוד לא פרסמת פריטים', desc: 'פרסמו פריט כדי ששכנים יוכלו לשאול אותו.', to: '/items/new', cta: 'פרסמו פריט' },
  incoming: { ic: '📥', title: 'אין עדיין בקשות לפריטים שלך', desc: 'כשמישהו יבקש לשאול פריט שלך — הבקשה תופיע כאן.', to: '/items/new', cta: 'פרסמו פריט' },
};

/* ── BookingManager ────────────────────────────────────────────────────────
   The full "ניהול ההשאלות והפריטים" card carried over from the old dashboard: a
   tabbed view over the user's rentals / own items / incoming requests, with the
   booking actions (approve/reject/return), own-item edit+delete, and two-way
   reviews wired through the callbacks. All data and actions come from
   useProfileData via props; this only renders. */
export default function BookingManager({
  tab, setTab, rentals, myItems, incoming,
  loading, listErr, load, busyId, handleAction, itemStatus,
  onReview, onEdit, onDelete,
}) {
  const tabList = tab === 'rentals' ? rentals : tab === 'items' ? myItems : incoming;
  const tabRole = tab === 'rentals' ? 'renter' : 'owner';
  const empty = EMPTY[tab];

  return (
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
          <div className="eb-ic">{empty.ic}</div>
          <p className="eb-title">{empty.title}</p>
          <p className="eb-desc">{empty.desc}</p>
          <Link className="btn btn-accent btn-sm" to={empty.to}>{empty.cta}</Link>
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
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
              : tabList.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  role={tabRole}
                  busy={busyId === b.id}
                  onAction={handleAction}
                  onReview={(booking) => onReview({ booking, role: tabRole })}
                />
              ))}
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
