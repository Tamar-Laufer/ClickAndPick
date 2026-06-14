export default function PasswordForm({ pw, setPw, pwMsg, pwErr, pwSaving, savePassword }) {
  return (
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
  );
}
