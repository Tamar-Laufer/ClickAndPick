import useAdminInbox from '../hooks/useAdminInbox';
import Avatar from '../../../shared/ui/Avatar';
import Loader from '../../../shared/ui/Loader';

const AV_COLORS = ['var(--block)', 'var(--accent)', '#B8841A', '#B23A66', '#2D6BE0'];
const FILTERS = [
  { value: 'all', label: 'הכול' },
  { value: 'recommendation', label: 'המלצות' },
  { value: 'question', label: 'שאלות' },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminInbox() {
  const { items, filter, setFilter, err, loading, hasMore, loadMore, moreBusy, approvedCount, toggleApprove } = useAdminInbox();

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
      ) : items.length === 0 ? (
        <p className="panel-empty">אין פניות להצגה.</p>
      ) : (
        <>
          <p className="inbox-summary">{approvedCount} המלצות מוצגות בדף הבית</p>
          <div className="rev-mgr">
            {items.map((f, i) => {
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

          {hasMore && (
            <button
              type="button"
              className="admin-page-btn inbox-more"
              onClick={loadMore}
              disabled={moreBusy}
            >
              {moreBusy ? 'טוען…' : 'טען עוד'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
