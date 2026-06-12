import { useState } from 'react';
import { fullName } from '../../../shared/utils/format';
import useApi from '../../../shared/hooks/useApi';

// Logic behind one side of the double-blind review modal: the star rating, the
// comment, the submit (POST /bookings/:id/reviews), and the resulting reveal.
const useReviewForm = ({ booking, role, onSubmitted }) => {
  const { apiCall, execute, loading, error, setError } = useApi();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState(null); // { review, revealed }

  const item = booking.item || {};
  const isRenter = role === 'renter';
  const title = isRenter ? 'דרגו את הפריט' : 'דרגו את השוכר';
  const subject = isRenter
    ? (item.title || 'הפריט')
    : (booking.renter ? fullName(booking.renter) : 'השוכר');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setError('בחרו דירוג בין 1 ל-5 כוכבים'); return; }
    const data = await execute(() => apiCall(`/bookings/${booking.id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }));
    if (!data) return; // submit failed → message already in `error`
    setResult(data);
    onSubmitted?.(booking.id);
  };

  return { rating, setRating, hover, setHover, comment, setComment, result, isRenter, title, subject, loading, error, handleSubmit };
};

export default useReviewForm;
