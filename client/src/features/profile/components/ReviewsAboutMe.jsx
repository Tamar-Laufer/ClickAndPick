export default function ReviewsAboutMe({ rating, reviewCount, initial }) {
  return (
    <div className="prof-card">
      <h3>ביקורות עליי</h3>
      {reviewCount > 0 ? (
        <div className="review">
          <div className="review-top">
            <span className="review-av">{initial}</span>
            <span className="review-nm">דירוג ממוצע כשואל/ת</span>
            <span className="review-stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
          </div>
          <p>{rating.toFixed(1)} מתוך 5 · מבוסס על {reviewCount} ביקורות שקיבלת מהקהילה.</p>
        </div>
      ) : (
        <p className="prof-empty">עוד אין ביקורות עליך — הן יופיעו כאן אחרי ההשאלות הראשונות.</p>
      )}
    </div>
  );
}
