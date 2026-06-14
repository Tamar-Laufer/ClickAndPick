import { useState } from 'react';
import { fullName } from '../../../shared/utils/format';
import useApi from '../../../shared/hooks/useApi';

const useReviewForm = ({ booking, role, onSubmitted }) => {
  const { apiCall, execute, loading, error, setError } = useApi();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState(null);

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
    if (!data) return;
    setResult(data);
    onSubmitted?.(booking.id);
  };

  return { rating, setRating, hover, setHover, comment, setComment, result, isRenter, title, subject, loading, error, handleSubmit };
};

export default useReviewForm;
