import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import Avatar from './Avatar';
import Loader from './Loader';

/* ── Admin Inbox ───────────────────────────────────────────────────────────
   Every public submission from POST /api/feedback.
   GET   /admin/feedback                       → list
   PATCH /admin/feedback/:id/toggle-approve    → show / hide a recommendation
   Questions display the message only; recommendations get a "show on
   homepage" toggle (reuses the shared .switch styling). */

const AV_COLORS = ['var(--block)', 'var(--accent)', '#B8841A', '#B23A66', '#2D6BE0'];
const FILTERS = [
  { value: 'all', label: 'הכול' },
  { value: 'recommendation', label: 'המלצות' },
  { value: 'question', label: 'שאלות' },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminInbox() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/admin/feedback', {}, token)
      .then((d) => setItems(d.feedback || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((f) => f.type === filter)),
    [items, filter],
  );

  async function toggleApprove(id) {
    try {
      const { feedback } = await apiFetch(
        `/admin/feedback/${id}/toggle-approve`,
        { method: 'PATCH' },
        token,
      );
      setItems((prev) => prev.map((f) => (f.id === id ? feedback : f)));
    } catch (e) {
      setErr(e.message);
    }
  }

  const approvedCount = items.filter((f) => f.type === 'recommendation' && f.isApprovedForHomepage).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>תיבת פניות</h2>
        <div className="pick">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`seg${filter === f.value ? ' on' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="cat-err">{err}</p>}

      {loading ? (
        <Loader className="panel-empty" />
      ) : visible.length === 0 ? (
        <p className="panel-empty">אין פניות להצגה.</p>
      ) : (
        <>
          <p className="inbox-summary">{approvedCount} המלצות מוצגות בדף הבית</p>
          <div className="rev-mgr">
            {visible.map((f, i) => {
              const isRec = f.type === 'recommendation';
              return (
                <div className="rev-item" key={f.id}>
                  <Avatar
                    user={{ avatarUrl: f.avatarUrl }}
                    name={f.name}
                    size={40}
                    className="rev-av"
                    style={{ '--av-bg': AV_COLORS[i % AV_COLORS.length] }}
                  />
                  <div className="rev-main">
                    <div className="rev-by">
                      <span className="nm">{f.name}</span>
                      <span className={`fb-badge fb-${f.type}`}>{isRec ? 'המלצה' : 'שאלה'}</span>
                      <span className="fb-date">{formatDate(f.createdAt)}</span>
                    </div>
                    <div className="rev-txt">{f.message}</div>
                    <a className="fb-mail" href={`mailto:${f.email}`}>{f.email}</a>
                  </div>

                  {isRec && (
                    <div className="rev-toggle">
                      <button
                        className={`switch${f.isApprovedForHomepage ? ' on' : ''}`}
                        onClick={() => toggleApprove(f.id)}
                        aria-label={f.isApprovedForHomepage ? 'הסתרה מדף הבית' : 'הצגה בדף הבית'}
                      />
                      <span className={`tl${f.isApprovedForHomepage ? ' on' : ''}`}>
                        {f.isApprovedForHomepage ? 'מוצגת' : 'מוסתרת'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
