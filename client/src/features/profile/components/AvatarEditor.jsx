export default function AvatarEditor({ name, initial, avatar }) {
  const {
    avatar: saved, pendingPreview, avatarBusy, avatarErr,
    pickAvatar, cancelAvatar, saveAvatar, removeAvatar,
  } = avatar;

  return (
    <div className="prof-photo-wrap">
      <div className="prof-photo">
        {(pendingPreview || saved)
          ? <img src={pendingPreview || saved} alt={name} />
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
        <div className="prof-photo-actions">
          <button type="button" className="ppa-link" disabled={avatarBusy}
            onClick={() => document.getElementById('avatarFile').click()}>
            {saved ? 'החלפת תמונה' : 'העלאת תמונה'}
          </button>
          {saved && (
            <button type="button" className="ppa-link danger" disabled={avatarBusy} onClick={removeAvatar}>
              הסרת תמונה
            </button>
          )}
        </div>
      )}

      {avatarErr && <span className="prof-photo-err">{avatarErr}</span>}
    </div>
  );
}
