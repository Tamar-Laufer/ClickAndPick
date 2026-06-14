import useCreateItem from '../hooks/useCreateItem';
import { useCategories } from '../../../shared/context/CategoriesContext';
import TgNavbar from '../../../shared/layout/TgNavbar';
import './CreateItem.css';


const CreateItem = () => {
  const { categories } = useCategories();
  const { form, imageUrl, uploading, loading, error, fileRef, handleChange, handleFile, handleSubmit } = useCreateItem();

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

      <main className="ci">
        <div className="ci-card">
          <span className="kicker"><span className="idx">+</span> פריט חדש</span>
          <h1>פרסמו פריט לשיתוף</h1>
          <p className="ci-lead">העלו תמונה, כתבו תיאור קצר וקבעו מחיר יומי — והפריט יופיע לשכנים.</p>

          {error && <p className="ci-error">{error}</p>}

          <form onSubmit={handleSubmit}>

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
                  {categories.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
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
};

export default CreateItem;
