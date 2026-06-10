import Avatar from '../ui/Avatar';
import { fullName } from '../../utils/format';

const AV_COLORS = ['var(--block)', 'var(--accent)', '#B8841A', '#B23A66', '#2D6BE0'];

/* ── UsersTable ────────────────────────────────────────────────────────────
   The searchable users panel: trust meter, booking/item counts, and an
   activate/deactivate action per row (disabled for the admin's own row).
   `users` is already filtered by the search query in useAdminDashboard. */
export default function UsersTable({ users, query, setQuery, currentUserId, onToggle }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>משתמשים</h2>
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" placeholder="חיפוש משתמש…" aria-label="חיפוש" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="table-wrap">
        <table className="users">
          <thead>
            <tr><th>משתמש</th><th>מד אמון</th><th>הזמנות</th><th>פריטים</th><th>סטטוס</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const name = fullName(u, 'משתמש');
              const trust = Number.isFinite(Number(u.trustScore)) ? Number(u.trustScore) : 50;
              const tCls = trust >= 80 ? 'hi' : trust >= 60 ? 'mid' : 'lo';
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className={u.isActive ? '' : 'disabled'}>
                  <td>
                    <div className="u-cell">
                      {u.avatarUrl
                        ? <Avatar user={u} name={name} size={36} className="u-av" />
                        : <span className="u-av" style={{ '--av-c': AV_COLORS[i % AV_COLORS.length] }}>{(name || '?')[0]}</span>}
                      <div><div className="u-name">{name}</div><div className="u-mail">{u.email}</div></div>
                    </div>
                  </td>
                  <td>
                    <div className="trust-mini">
                      <span className="trust-bar"><span className={`trust-fill ${tCls}`} style={{ '--trust-w': `${trust}%` }} /></span>
                      <span className="trust-val">{trust}</span>
                    </div>
                  </td>
                  <td>{u.bookingCount}</td>
                  <td>{u.itemCount}</td>
                  <td><span className={`u-status ${u.isActive ? 'active' : 'off'}`}><span className="d" />{u.isActive ? 'פעיל' : 'מושבת'}</span></td>
                  <td>
                    {isSelf
                      ? <span className="u-self">זה אני</span>
                      : <button className={`u-action${u.isActive ? ' danger' : ''}`} onClick={() => onToggle(u)}>{u.isActive ? 'השבתה' : 'הפעלה'}</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
