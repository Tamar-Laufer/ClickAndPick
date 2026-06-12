const Edit = ({
  label,
  value, setValue, onSave, onCancel,
  placeholder  = 'Edit...',
  multiline    = false,
  autoFocus    = true,
  disabled     = false,
  type         = 'text',
  showButtons  = true,
  wrapperClass = 'edit-form',
  inputClass   = ''
}) => (
  <div className={wrapperClass}>
    {label && <label className="edit-label">{label}</label>}
    {multiline ? (
      <textarea
        className={inputClass}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    ) : (
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onKeyDown={(e) => e.key === 'Enter' && onSave?.()}
      />
    )}
    {showButtons && (
      <>
        <button onClick={onSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </>
    )}
  </div>
);

export default Edit;
