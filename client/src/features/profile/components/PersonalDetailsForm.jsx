export default function PersonalDetailsForm({ form, field, editing, msg, err, saving, toggleEdit, email }) {
  return (
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
          <input type="email" value={email} disabled /></div>
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
  );
}
