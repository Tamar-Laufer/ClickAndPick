import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoriesContext';
import { apiFetch } from '../../services/api';
import { useAsyncAction } from '../../hooks/useAsyncAction';

/* ── Category Manager ──────────────────────────────────────────────────────
   Admin panel: list existing categories and add new ones dynamically. New
   categories appear immediately in item forms and search filters (everything
   reads from CategoriesContext).
     POST /categories  (admin) → { label, color }
   The stored `value` is derived from the label server-side. */

const COLORS = [
  { value: 'coral', hex: '#EE5A2A' },
  { value: 'teal', hex: '#0E8C8B' },
  { value: 'green', hex: '#4B8B3B' },
  { value: 'blue', hex: '#2D6BE0' },
  { value: 'butter', hex: '#E0A92E' },
];

export default function CategoryManager() {
  const { token } = useAuth();
  const { categories, addCategory } = useCategories();
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('coral');

  // loading/error boilerplate via the shared hook; the action throws on failure
  const { run, loading: busy, error: err } = useAsyncAction(async (trimmed) => {
    const { category } = await apiFetch(
      '/categories',
      { method: 'POST', body: JSON.stringify({ label: trimmed, color }) },
      token,
    );
    addCategory(category);
    setLabel('');
    setColor('coral');
  });

  function handleAdd(e) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || busy) return;
    run(trimmed);
  }

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
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
