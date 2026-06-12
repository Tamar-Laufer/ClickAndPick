import Avatar from '../../../shared/ui/Avatar';
import Stars from '../../../shared/ui/Stars';
import { fullName } from '../../../shared/utils/format';

/* ── ItemReviews ───────────────────────────────────────────────────────────
   The public reviews section on the item detail page: the average header and
   the list of revealed (double-blind) reviews, with a loading and an empty
   state. */
export default function ItemReviews({ item, reviews, reviewsLoading }) {
  return (
    <section className="reviews-sec" id="reviews">
      <div className="wrap">
        <div className="reviews-head">
          <h2>ביקורות על הפריט</h2>
          {item.totalReviews > 0 && (
            <div className="reviews-avg">
              <Stars value={item.averageRating} />
              <strong>{Number(item.averageRating).toFixed(1)}</strong>
              <span>מתוך 5 · {item.totalReviews} ביקורות</span>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <p className="reviews-empty">טוען ביקורות…</p>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">עדיין אין ביקורות על הפריט הזה. היו הראשונים לשאול ולדרג!</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(r => {
              const who = fullName(r.reviewerId, 'משתמש');
              const when = r.createdAt
                ? new Date(r.createdAt).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                : '';
              return (
                <div className="review-card" key={r.id}>
                  <div className="review-card-top">
                    <Avatar user={r.reviewerId} name={who} size={40} className="review-card-av" />
                    <div className="review-card-meta">
                      <span className="review-card-nm">{who}</span>
                      {when && <span className="review-card-date">{when}</span>}
                    </div>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="review-card-text">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
