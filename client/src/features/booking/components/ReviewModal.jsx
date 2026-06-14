import useReviewForm from '../hooks/useReviewForm';
import Modal from '../../../shared/ui/Modal';
import './ReviewModal.css';


const ReviewModal = ({ booking, role, onClose, onSubmitted }) => {
  const { rating, setRating, hover, setHover, comment, setComment, result, isRenter, title, subject, loading, error, handleSubmit } =
    useReviewForm({ booking, role, onSubmitted });

  return (
    <Modal onClose={onClose} overlayClassName="rv-overlay" className="rv-box">
        <button className="rv-close" onClick={onClose} aria-label="סגירה">✕</button>

        {result ? (
          <div className="rv-done">
            <div className="rv-done-ic">✓</div>
            <h3>תודה על הביקורת!</h3>
            <p>{result.revealed
              ? 'שני הצדדים דירגו — הביקורות פורסמו עכשיו.'
              : 'הביקורת נשמרה ותתפרסם ברגע שגם הצד השני ידרג (או בתום 7 ימים).'}</p>
            <button className="rv-submit" onClick={onClose}>סגירה</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="rv-title">{title}</h3>
            <p className="rv-subject">{subject}</p>

            <div className="rv-stars" role="radiogroup" aria-label="דירוג">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  className={`rv-star${i <= (hover || rating) ? ' on' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                  aria-label={`${i} כוכבים`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
                </button>
              ))}
            </div>

            <textarea
              className="rv-text"
              rows={4}
              placeholder={isRenter ? 'איך היה הפריט? מצב, התאמה לתיאור…' : 'איך הייתה ההתנהלות מול השוכר?'}
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={1000}
            />

            {error && <p className="rv-error">{error}</p>}

            <button type="submit" className="rv-submit" disabled={loading}>
              {loading ? 'שולח…' : 'שליחת ביקורת'}
            </button>
            <p className="rv-note">הביקורות עיוורות — הן נחשפות רק כששני הצדדים דירגו, כדי למנוע ביקורות נקמה.</p>
          </form>
        )}
    </Modal>
  );
};

export default ReviewModal;
