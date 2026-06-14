import useCategoryForm from '../hooks/useCategoryForm';

const COLORS = [
  { value: 'coral', hex: '#EE5A2A' },
  { value: 'teal', hex: '#0E8C8B' },
  { value: 'green', hex: '#4B8B3B' },
  { value: 'blue', hex: '#2D6BE0' },
  { value: 'butter', hex: '#E0A92E' },
];

const CategoryManager = () => {
  const { categories, label, setLabel, color, setColor, busy, err, handleAdd } = useCategoryForm();

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>ניהול קטגוריות</h2>
        <span className="cat-count">{categories.length} קטגוריות</span>
      </div>

      <form className="cat-form" onSubmit={handleAdd}>
        <input
          className="cat-input"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="שם הקטגוריה (למשל: ספרים)"
          aria-label="שם הקטגוריה"
          maxLength={60}
        />
        <div className="cat-colors" role="radiogroup" aria-label="צבע">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cat-swatch${color === c.value ? ' on' : ''}`}
              style={{ '--cat-c': c.hex }}
              onClick={() => setColor(c.value)}
              aria-label={c.value}
              aria-pressed={color === c.value}
            />
          ))}
        </div>
        <button className="btn btn-accent" type="submit" disabled={busy || !label.trim()}>
          {busy ? 'מוסיף…' : 'הוספה'}
        </button>
      </form>

      {err && <p className="cat-err">{err}</p>}

      {categories.length === 0 ? (
        <p className="panel-empty">אין עדיין קטגוריות.</p>
      ) : (
        <div className="cat-chips">
          {categories.map((c) => (
              <span className={`cat-chip cat-${c.color}`} key={c._id || c.id || c.value} >
              <span className="cat-dot" aria-hidden="true" />
              {c.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
