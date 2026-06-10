import { useState, useRef } from 'react';
import { apiFetch, uploadImage } from '../services/api';
import { useCategories } from '../context/CategoriesContext';
import { useAsyncAction } from '../hooks/useAsyncAction';
import Modal from './Modal';
import './LoanRequestModal.css'; // reuse the shared modal shell + form field styles
import './EditItemModal.css';

/* ── EditItemModal ─────────────────────────────────────────────────────────
   Opened from "הפריטים שלי" in the personal area. Pre-fills the form with the
   item's current details and saves via PATCH /items/:id. The server re-verifies
   ownership (403 if the JWT user isn't the owner), so this is a convenience UI —
   not the security boundary. On success it hands the updated item back to the
   parent so the list can be patched in place without a full refetch.            */
export default function EditItemModal({ item, token, onClose, onSaved }) {
  const { categories } = useCategories();
  // Mirror the editable Item fields. Note the schema names: `dailyRate` (not
  // dailyPrice) and a single `imageUrl` (not an images array).
  const [form, setForm] = useState({
    title: item.title || '',
    description: item.description || '',
    category: item.category || (categories[0]?.value ?? ''),
    dailyRate: item.dailyRate ?? '',
    // Item location is stored only as a privacy-fuzzed point (never returned to
    // the client), so we can't pre-fill the current address. Left blank, the
    // location is unchanged; typing a new address re-geocodes it server-side.
    address: '',
  });
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setUploading(true);
    try {
      setImageUrl(await uploadImage(file, token));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const { run: handleSubmit, loading: saving, error, setError } = useAsyncAction(async (e) => {
    e.preventDefault();
    if (!form.title.trim()) throw new Error('שם הפריט הוא שדה חובה');
    const { item: updated } = await apiFetch(`/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        dailyRate: Number(form.dailyRate) || 0,
        imageUrl,
        // only send address when the owner typed one — blank leaves the
        // current pickup location untouched.
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      }),
    }, token);
    onSaved(updated); // let the parent patch its list state
    onClose();
  });

  return (
    <Modal onClose={onClose} showClose>
        <div className="modal-header">
          <h2 className="modal-title">עריכת פריט</h2>
          <p className="modal-item-name">עדכנו את פרטי הפריט — השינויים יופיעו מיד לשכנים.</p>
        </div>

        {error && <p className="form-error edit-error">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">

          {/* image */}
          <div className="modal-field">
            <label className="modal-label">תמונת הפריט</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            <button
              type="button"
              className={`edit-drop${imageUrl ? ' has-img' : ''}`}
              onClick={() => fileRef.current?.click()}
            >
              {imageUrl
                ? <><img src={imageUrl} alt="תצוגה מקדימה" /><span>{uploading ? 'מעלה…' : 'החליפו תמונה'}</span></>
                : <span>{uploading ? 'מעלה…' : 'לחצו להעלאת תמונה'}</span>}
            </button>
          </div>

          <div className="modal-field">
            <label className="modal-label">שם הפריט *</label>
            <input className="modal-input" name="title" value={form.title}
              onChange={handleChange} required placeholder="לדוגמה: מקדחה רוטטת בוש" />
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label className="modal-label">קטגוריה *</label>
              <select className="modal-input" name="category" value={form.category} onChange={handleChange}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">מחיר ליום (₪) *</label>
              <input className="modal-input" name="dailyRate" type="number" min="0" step="1"
                value={form.dailyRate} onChange={handleChange} required placeholder="0" />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">תיאור</label>
            <textarea className="modal-input" name="description" rows={4}
              value={form.description} onChange={handleChange}
              placeholder="פרטים על הפריט, מצב, מה כלול…" />
          </div>

          <div className="modal-field">
            <label className="modal-label">עדכון כתובת איסוף (רשות)</label>
            <input className="modal-input" name="address" value={form.address}
              onChange={handleChange} autoComplete="off"
              placeholder="לדוגמה: הרצל 10, ירושלים" />
            <small className="edit-hint">השאירו ריק כדי לא לשנות את המיקום הנוכחי. הזנת כתובת חדשה תעדכן את מיקום האיסוף. הכתובת המדויקת לעולם לא מוצגת לאחרים — היא משמשת רק לחישוב מרחק מקורב.</small>
          </div>

          <button type="submit" className="modal-submit" disabled={saving || uploading}>
            {saving ? 'שומר…' : 'שמירת שינויים'}
          </button>
        </form>
    </Modal>
  );
}
