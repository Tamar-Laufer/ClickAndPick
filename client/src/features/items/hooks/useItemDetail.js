import { useEffect, useState } from 'react';
import { apiFetch } from '../../../shared/services/api';

export default function useItemDetail(id) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    const load = async () => {
      try {
        const d = await apiFetch(`/items/${id}`);
        if (alive) setItem(d.item);
      } catch (e) {
        if (alive) setError(e.message || 'הפריט לא נמצא');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);
    const load = async () => {
      try {
        const d = await apiFetch(`/items/${id}/reviews`);
        if (alive) setReviews(d.reviews || []);
      } catch {
        if (alive) setReviews([]);
      } finally {
        if (alive) setReviewsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [id]);

  return { item, loading, error, reviews, reviewsLoading };
}
