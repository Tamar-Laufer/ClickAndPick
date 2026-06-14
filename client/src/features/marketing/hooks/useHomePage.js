import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../../../shared/services/api';
import { useCategories } from '../../../shared/context/CategoriesContext';
import { useAuth } from '../../../shared/context/AuthContext';

const useHomePage = () => {
  const rootRef = useRef(null);
  const location = useLocation();
  const { labelOf } = useCategories();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);


  useEffect(() => {
    const loadItems = async () => {
      try {
        const d = await apiFetch('/items?limit=12');
        setItems(d.items || []);
      } catch { }
    };
    const loadReviews = async () => {
      try {
        const d = await apiFetch('/feedback/approved');
        setReviews((d.feedback || []).map(f => ({
          text: f.message,
          name: f.name,
          avatarUrl: f.avatarUrl || null,
        })));
      } catch { }
    };
    const loadStats = async () => {
      try {
        const d = await apiFetch('/stats');
        setStats(d.stats || null);
      } catch { }
    };
    loadItems();
    loadReviews();
    loadStats();
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal]') ?? [];
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return { rootRef, user, labelOf, items, reviews, stats };
};

export default useHomePage;
