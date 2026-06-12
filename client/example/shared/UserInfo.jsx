import useUserInfo from './useUserInfo';
import Edit from '../shared/Edit';
import './UserInfo.css';

const UserInfo = ({ isOpen, onClose }) => {
  const {
    user, isEditing, isChangingCredentials, loading, error,
    form, setField, setAddrField, setCompField,
    creds, setCredField,
    reset, openEdit, openCredentials, saveProfile, saveCredentials
  } = useUserInfo();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">
            {!isEditing && !isChangingCredentials && 'User Information'}
            {isEditing                             && 'Edit Profile'}
            {isChangingCredentials                 && 'Change Credentials'}
          </h2>
          <button onClick={onClose} className="modal-close-button">×</button>
        </div>

        {!isEditing && !isChangingCredentials && (
          <div className="user-info">
            <div className="user-info-item"><strong>Username</strong><span>{user?.username || '—'}</span></div>
            <div className="user-info-item"><strong>Full Name</strong><span>{user?.name || '—'}</span></div>
            <div className="user-info-item"><strong>Email</strong><span>{user?.email || '—'}</span></div>
            <div className="user-info-item"><strong>Phone</strong><span>{user?.phone || '—'}</span></div>
            <div className="user-info-item"><strong>Address</strong><span>{user?.address?.street ? `${user.address.street}, ${user.address.city}` : '—'}</span></div>
            <div className="user-info-item"><strong>Company</strong><span>{user?.company?.name || '—'}</span></div>
          </div>
        )}

        {isEditing && (
          <div className="user-edit-form">
            <Edit label="Full Name"    value={form.name || ''}            setValue={(v) => setField('name', v)}       disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" />
            <Edit label="Email"        value={form.email || ''}           setValue={(v) => setField('email', v)}      disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" autoFocus={false} />
            <Edit label="Phone"        value={form.phone || ''}           setValue={(v) => setField('phone', v)}      disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" autoFocus={false} />
            <Edit label="Street"       value={form.address?.street || ''} setValue={(v) => setAddrField('street', v)} disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" autoFocus={false} />
            <Edit label="City"         value={form.address?.city || ''}   setValue={(v) => setAddrField('city', v)}   disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" autoFocus={false} />
            <Edit label="Company Name" value={form.company?.name || ''}   setValue={(v) => setCompField('name', v)}   disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" autoFocus={false} />
            {error && <div className="edit-error">{error}</div>}
          </div>
        )}

        {isChangingCredentials && (
          <div className="user-edit-form">
            <Edit label="Current Password" type="password" value={creds.oldPassword}    setValue={(v) => setCredField('oldPassword', v)}     disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" placeholder="Required" />
            <div className="edit-divider">New credentials (fill what you want to change)</div>
            <Edit label="New Username"     type="text"     value={creds.newUsername}     setValue={(v) => setCredField('newUsername', v)}     disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" placeholder="Leave empty to keep current" autoFocus={false} />
            <Edit label="New Password"     type="password" value={creds.newPassword}     setValue={(v) => setCredField('newPassword', v)}     disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" placeholder="Leave empty to keep current" autoFocus={false} />
            <Edit label="Confirm Password" type="password" value={creds.confirmPassword} setValue={(v) => setCredField('confirmPassword', v)} disabled={loading} showButtons={false} wrapperClass="edit-field" inputClass="edit-input" placeholder="Repeat new password"         autoFocus={false} />
            {error && <div className="edit-error">{error}</div>}
          </div>
        )}

        <div className="modal-footer">
          {!isEditing && !isChangingCredentials && (
            <>
              <button onClick={openEdit}        className="btn-edit">Edit Profile</button>
              <button onClick={openCredentials} className="btn-credentials">Change Credentials</button>
              <button onClick={onClose}         className="btn-close-modal">Close</button>
            </>
          )}
          {isEditing && (
            <>
              <button onClick={reset}       disabled={loading} className="btn-cancel">Cancel</button>
              <button onClick={saveProfile} disabled={loading} className="btn-save">{loading ? 'Saving...' : 'Save'}</button>
            </>
          )}
          {isChangingCredentials && (
            <>
              <button onClick={reset}           disabled={loading} className="btn-cancel">Cancel</button>
              <button onClick={saveCredentials} disabled={loading} className="btn-save">{loading ? 'Saving...' : 'Update'}</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserInfo;
