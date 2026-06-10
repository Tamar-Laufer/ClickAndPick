import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

/* ── useItemDetail ─────────────────────────────────────────────────────────
   Loads one item and its public reviews for the detail page. Two independent
   fetches keyed on :id, each resetting to its loading state on a new id and
   guarding a late resolve after unmount/navigation with `alive`. The setState
   on each new id is the intended loading toggle of a data fetch, not a
   synchronous render loop. */
export function useItemDetail(id) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError('');
    apiFetch(`/items/${id}`)
      .then(d => { if (alive) setItem(d.item); })
      .catch(e => { if (alive) setError(e.message || 'הפריט לא נמצא'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  /* public reviews for this item (revealed double-blind reviews) */
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewsLoading(true);
    apiFetch(`/items/${id}/reviews`)
      .then(d => { if (alive) setReviews(d.reviews || []); })
      .catch(() => { if (alive) setReviews([]); })
      .finally(() => { if (alive) setReviewsLoading(false); });
    return () => { alive = false; };
  }, [id]);

  return { item, loading, error, reviews, reviewsLoading };
}
