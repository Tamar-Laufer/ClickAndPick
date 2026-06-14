import useAdminUsers from '../hooks/useAdminUsers';
import { fullName } from '../../../shared/utils/format';

export default function AdminUsers({ currentUserId }) {
  const { users, page, setPage, search, onSearch, totalPages, isLoading, error, toggleStatus } = useAdminUsers();

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>משתמשים</h2>
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="search"
            placeholder="חיפוש לפי שם או מייל…"
            aria-label="חיפוש משתמש"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="cat-err">{error}</p>}

      <div className="table-wrap">
        <table className="users">
          <thead>
            <tr><th>משתמש</th><th>הזמנות</th><th>פריטים</th><th>סטטוס</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'disabled'}>
                <td>
                  <div className="u-name">{fullName(u, 'משתמש')}</div>
                  <div className="u-mail">{u.email}</div>
                </td>
                <td>{u.bookingCount}</td>
                <td>{u.itemCount}</td>
                <td>
                  <span className={`u-status ${u.isActive ? 'active' : 'off'}`}>
                    <span className="d" />{u.isActive ? 'פעיל' : 'מושבת'}
                  </span>
                </td>
                <td>
                  {u.id === currentUserId
                    ? <span className="u-self">זה אני</span>
                    : (
                      <button className={`u-action${u.isActive ? ' danger' : ''}`} onClick={() => toggleStatus(u)}>
                        {u.isActive ? 'השבתה' : 'הפעלה'}
                      </button>
                    )}
                </td>
              </tr>
            ))}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={5} className="admin-empty-row">לא נמצאו משתמשים</td></tr>
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
