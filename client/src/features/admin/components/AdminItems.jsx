import useAdminItems from '../hooks/useAdminItems';
import { fullName, priceText } from '../../../shared/utils/format';

export default function AdminItems() {
  const { items, page, setPage, search, onSearch, totalPages, isLoading, error, toggleStatus } = useAdminItems();

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>פריטים</h2>
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="search"
            placeholder="חיפוש לפי שם או קטגוריה…"
            aria-label="חיפוש פריט"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="cat-err">{error}</p>}

      <div className="table-wrap">
        <table className="users">
          <thead>
            <tr><th>פריט</th><th>בעלים</th><th>קטגוריה</th><th>מחיר</th><th>סטטוס</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className={it.isActive ? '' : 'disabled'}>
                <td><div className="u-name">{it.title}</div></td>
                <td>{fullName(it.owner, 'לא ידוע')}</td>
                <td>{it.category}</td>
                <td>{priceText(it)}</td>
                <td>
                  <span className={`u-status ${it.isActive ? 'active' : 'off'}`}>
                    <span className="d" />{it.isActive ? 'פעיל' : 'מושבת'}
                  </span>
                </td>
                <td>
                  <button className={`u-action${it.isActive ? ' danger' : ''}`} onClick={() => toggleStatus(it)}>
                    {it.isActive ? 'השבתה' : 'הפעלה'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="admin-empty-row">לא נמצאו פריטים</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pager">
        <button
          className="admin-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || isLoading}
        >
          הקודם
        </button>
        <span className="admin-page-info">עמוד {page} מתוך {totalPages}</span>
        <button
          className="admin-page-btn"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages || isLoading}
        >
          הבא
        </button>
      </div>
    </div>
  );
}
