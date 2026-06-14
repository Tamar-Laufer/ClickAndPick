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
        <input type="file" id="avatarFile" accept="image/*" hidden onChange={pickAvatar} />
      </div>

      {pendingPreview ? (
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
