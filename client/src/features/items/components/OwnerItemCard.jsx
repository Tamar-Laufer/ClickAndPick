import { Link } from 'react-router-dom';
import { useCategories } from '../../../shared/context/CategoriesContext';
import '../../booking/components/BookingCard.css';

/* A row for one of the user's own uploaded items, with its loan status.
   `onEdit`   (optional) shows an "עריכה" button that opens the edit modal.
   `onDelete` (optional) shows a trash-can button that asks the parent to confirm
   + soft-delete the item. */
export default function OwnerItemCard({ item, status, onEdit, onDelete }) {
  const { labelOf } = useCategories();
  const img = item.imageUrl || null;
  return (
    <article className="bk">
      <Link className="bk-media" to={`/item/${item.id}`}>
        <div className="bk-ph">{item.title ? item.title[0] : '?'}</div>
        {img && <img src={img} alt={item.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      </Link>

      <div className="bk-body">
        <div className="bk-top">
          <span className="bk-title">{item.title}</span>
          <span className={`bk-status ${status.cls}`}>{status.label}</span>
        </div>

        <div className="bk-meta">
          {labelOf(item.category) || 'פריט'}{item.isActive === false ? ' · מוסתר מהקטלוג' : ''}
        </div>

        <div className="bk-foot">
          <span className="bk-price">₪{item.dailyRate} ליום</span>
          <div className="bk-actions">
            {onEdit && (
              <button type="button" className="bk-btn line" onClick={() => onEdit(item)}>עריכה</button>
            )}
            <Link className="bk-btn line" to={`/item/${item.id}`}>צפייה בפריט</Link>
            {onDelete && (
              <button
                type="button"
                className="bk-btn line bk-del"
                onClick={() => onDelete(item)}
                aria-label={`מחיקת ${item.title}`}
                title="מחיקת הפריט"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                מחיקה
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
