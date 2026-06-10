import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch, uploadImage } from '../services/api';
import { useCategories } from '../context/CategoriesContext';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useFullBleed } from '../hooks/useFullBleed';
import TgNavbar from '../components/layout/TgNavbar';
import './CreateItem.css';

/* ── "ביחד" create-item page — form + image upload ── */

export default function CreateItem() {
  const { token } = useAuth();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // `address` is the item's pickup address (e.g. "הרצל 10, ירושלים"). The server
  // geocodes it to coordinates — so a store/train item gets its *real* location,
  // not the uploader's current GPS position.
  const [form, setForm]   = useState({ title: '', description: '', category: 'TOOLS', dailyRate: '', address: '' });
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useFullBleed(); // full-bleed page — drop the global fixed-navbar spacing

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

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

  const { run: handleSubmit, loading, error, setError } = useAsyncAction(async (e) => {
    e.preventDefault();
    // address flows through ...form; the server geocodes it server-side.
    const payload = { ...form, dailyRate: Number(form.dailyRate), imageUrl };
    const data = await apiFetch('/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
    navigate(`/item/${data.item.id}`);
  });

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

      {/* form */}
      <main className="ci">
        <div className="ci-card">
          <span className="kicker"><span className="idx">+</span> פריט חדש</span>
          <h1>פרסמו פריט לשיתוף</h1>
          <p className="ci-lead">העלו תמונה, כתבו תיאור קצר וקבעו מחיר יומי — והפריט יופיע לשכנים.</p>

          {error && <p className="ci-error">{error}</p>}

          <form onSubmit={handleSubmit}>

            {/* image upload */}
            <div className="field">
              <label>תמונת הפריט</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
              <button
                type="button"
                className={`ci-drop${imageUrl ? ' has-img' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="תצוגה מקדימה" />
                    <span className="ci-drop-replace">{uploading ? 'מעלה…' : 'החליפו תמונה'}</span>
                  </>
                ) : (
                  <span className="ci-drop-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    {uploading ? 'מעלה…' : 'לחצו להעלאת תמונה'}
                    <small>JPG · PNG · WEBP · עד 5MB</small>
                  </span>
                )}
              </button>
            </div>

            <div className="field">
              <label>שם הפריט *</label>
              <input name="title" value={form.title} onChange={handleChange} required placeholder="לדוגמה: מקדחה רוטטת בוש" />
            </div>

            <div className="field-row">
              <div className="field">
                <label>קטגוריה *</label>
                <select name="category" value={form.category} onChange={handleChange} required>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>מחיר ליום (₪) *</label>
                <input name="dailyRate" type="number" min="0" step="1" value={form.dailyRate} onChange={handleChange} required placeholder="0" />
              </div>
            </div>

            <div className="field">
              <label>תיאור</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="פרטים על הפריט, מצב, מה כלול…" />
            </div>

            <div className="field">
              <label>כתובת איסוף (רשות)</label>
              <div className="ci-loc-input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                <input name="address" value={form.address} onChange={handleChange} placeholder="לדוגמה: הרצל 10, ירושלים" autoComplete="off" />
              </div>
              <small className="ci-loc-note">כתבו את הכתובת שבה אפשר לאסוף את הפריט — לא בהכרח המיקום הנוכחי שלכם. היא משמשת רק לחישוב מרחק מקורב; הכתובת המדויקת לעולם לא מוצגת לאחרים.</small>
            </div>

            <button type="submit" className="btn btn-accent ci-submit" disabled={loading || uploading}>
              {loading ? 'מפרסם…' : 'פרסמו את הפריט'}
            </button>
          </form>
        </div>
      </main>

    </div>
  );
}
