import useEditItem from '../hooks/useEditItem';
import Modal from '../../../shared/ui/Modal';
import './LoanRequestModal.css';
import './EditItemModal.css';

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
