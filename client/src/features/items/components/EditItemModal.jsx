import useEditItem from '../hooks/useEditItem';
import Modal from '../../../shared/ui/Modal';
import './LoanRequestModal.css'; // reuse the shared modal shell + form field styles
import './EditItemModal.css';

/* ── EditItemModal ─────────────────────────────────────────────────────────
   Opened from "הפריטים שלי" in the personal area. Pre-fills the form with the
   item's current details and saves via PATCH /items/:id. The server re-verifies
   ownership (403 if the JWT user isn't the owner), so this is a convenience UI —
   not the security boundary. On success it hands the updated item back to the
   parent so the list can be patched in place without a full refetch.            */
const EditItemModal = ({ item, token, onClose, onSaved }) => {
  const { categories, form, imageUrl, uploading, saving, error, fileRef, handleChange, handleFile, handleSubmit } =
    useEditItem({ item, token, onClose, onSaved });

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
                {categories.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
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
};

export default EditItemModal;
