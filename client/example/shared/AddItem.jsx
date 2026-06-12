const AddItem = ({
  value,
  setValue,
  onAdd,
  placeholder = 'Add new item...',
  buttonText  = 'Add',
  multiline   = false
}) => (
  <div className="add-item-section">
    {multiline ? (
      <textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
    ) : (
      <input value={value} onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && onAdd()} />
    )}
    <button onClick={onAdd}>{buttonText}</button>
  </div>
);

export default AddItem;
