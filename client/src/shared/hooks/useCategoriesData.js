import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import { CATEGORIES as STATIC_FALLBACK } from '../config/categories';


const CACHE_KEY = 'cp.categories.v1';

function normalize(list) {
  const byValue = new Map();
  for (const c of list) {
    // `value` is the Hebrew name — both the stored id and the display text.
    const value = String(c.value ?? c.label ?? c.name ?? '').trim();
    if (!value) continue;
    byValue.set(value, { ...c, value, color: c.color || 'coral' });
  }
  return [...byValue.values()].sort((a, b) => a.value.localeCompare(b.value, 'he'));
}

const signature = (list) => list.map((c) => `${c.value}|${c.color}`).join(';');

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(parsed) && parsed.length ? normalize(parsed) : null;
  } catch {
    return null; 
  }
}

function writeCache(list) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
  }
}

export default function useCategoriesData() {
  const [categories, setCategories] = useState(() => readCache() ?? STATIC_FALLBACK);
  const [loading, setLoading] = useState(true);

  const sigRef = useRef(null);
  if (sigRef.current === null) sigRef.current = signature(categories);

  const applyFresh = useCallback((list) => {
    const next = normalize(list);
    writeCache(next);
    const sig = signature(next);
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setCategories(next);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const d = await apiFetch('/categories');
        if (alive && d.categories?.length) applyFresh(d.categories);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('categories sync failed', err);
      } finally {
        if (alive) setLoading(false);
      }
    };
    sync();
    return () => { alive = false; };
  }, [applyFresh]);

  const addCategory = useCallback((cat) => {
    setCategories((prev) => {
      const next = normalize([...prev, cat]);
      writeCache(next);
      sigRef.current = signature(next);
      return next;
    });
  }, []);

  return { categories, loading, addCategory };
}
