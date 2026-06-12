import { useState } from 'react';
import { Link } from 'react-router-dom';
import BookingCard from '../../booking/components/BookingCard';
import OwnerItemCard from '../../items/components/OwnerItemCard';
import ErrorBoundary from '../../../shared/ui/ErrorBoundary';
import ChatWindow from '../../chat/components/chatWindow';
import { useAuth } from '../../../shared/context/AuthContext';
import useWebSocketChat from '../../chat/hooks/useWebSocketChat';

const EMPTY = {
  rentals: { title: 'עוד לא שאלת פריטים', desc: 'מצאו פריט מהשכנים והזמינו אותו.', to: '/search', cta: 'לכל הפריטים' },
  items: { title: 'עוד לא פרסמת פריטים', desc: 'פרסמו פריט כדי ששכנים יוכלו לשאול אותו.', to: '/items/new', cta: 'פרסמו פריט' },
  incoming: { title: 'אין עדיין בקשות לפריטים שלך', desc: 'כשמישהו יבקש לשאול פריט שלך — הבקשה תופיע כאן.', to: '/items/new', cta: 'פרסמו פריט' },
};

export default function BookingManager({
  tab, setTab, rentals, myItems, incoming,
  counts, hasMore, loadMore, moreBusy,
  loading, listErr, load, busyId, handleAction, itemStatus,
  onReview, onEdit, onDelete,
}) {
  const tabList = tab === 'rentals' ? rentals : tab === 'items' ? myItems : incoming;
  const tabRole = tab === 'rentals' ? 'renter' : 'owner';
  const empty = EMPTY[tab];

  // Badges show the server's TOTAL for each list (not just the loaded chunk).
  const tabs = [
    { key: 'rentals', label: 'ההשאלות שלי', count: counts.rentals },
    { key: 'items', label: 'הפריטים שלי', count: counts.items },
    { key: 'incoming', label: 'בקשות שהתקבלו', count: counts.incoming },
  ];

  const { token } = useAuth();
  const [chatTarget, setChatTarget] = useState(null);

  const { messages, connected, error, sendMessage } = useWebSocketChat(token, chatTarget?.id);

  function handleOpenChat(recipientId, recipientName) {
    setChatTarget({ id: recipientId, name: recipientName });
  }

  return (
    <div className="prof-card">
      <h3>ניהול ההשאלות והפריטים</h3>

      <div className="prof-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.key} role="tab" className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label} <span className="ptab-n">{t.count}</span>
          </button>
        ))}
      </div>

      {loading && <p className="prof-loading">טוען…</p>}

      {!loading && listErr && (
        <p className="pf-msg err">{listErr}<button type="button" onClick={load}>נסו שוב</button></p>
      )}

      {!loading && !listErr && tabList.length === 0 && (
        <div className="prof-empty-box">
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
                  onOpenChat={handleOpenChat}
                />
              ))}
          </div>
        </ErrorBoundary>
      )}

      {!loading && !listErr && hasMore[tab] && (
        <button
          type="button"
          className="btn btn-line on-light prof-load-more"
          onClick={() => loadMore(tab)}
          disabled={moreBusy === tab}
        >
          {moreBusy === tab ? 'טוען…' : 'טען עוד'}
        </button>
      )}
      {chatTarget && (
        <ChatWindow
          recipientName={chatTarget.name}
          messages={messages}
          connected={connected}
          error={error}
          token={token}
          onSend={sendMessage}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  );
}