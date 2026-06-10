import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../services/api';

export const PAGE_SIZE = 12;

/* ── useItemSearch ─────────────────────────────────────────────────────────
   The catalog's data + filters. Everything is server-driven: keyword, category,
   sort, date range and location all become GET /api/items query params, and each
   page is fetched (and appended) on demand rather than over-fetching the whole
   catalog. Location lives in a sibling hook (useGeoSearch) and is passed in, so
   buildParams + the search effect can react to it; clearAll resets the local
   filters and delegates the location reset back to it.

   Any filter change resets to page 1 and refetches, debounced so typing in the
   keyword box doesn't fire on every keystroke. */
export function useItemSearch(geo) {
  const { q: qParam = '' } = useParams();

  /* ── paginated feed state ── */
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);     // any fetch in flight (true → mount skeletons)
  const [isAppending, setIsAppending] = useState(false); // a "Load More" fetch
  const [error, setError] = useState('');

  /* ── filters (all server-driven) ── */
  const [query, setQuery] = useState(decodeURIComponent(qParam) === '-' ? '' : decodeURIComponent(qParam));
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sort, setSort] = useState('recommended');
  const [availFrom, setAvailFrom] = useState('');
  const [availTo, setAvailTo] = useState('');
  const [openSec, setOpenSec] = useState({ cats: true, avail: true, near: true });
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile filter sheet

  /* Build the query string for a given page from the current filters.
     A date range is only applied when BOTH ends are set; a location forwards
     lat/lng/radius and makes the backend return distance-sorted results. */
  const buildParams = useCallback((pageNum) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
    const term = query.trim();
    if (term) params.set('q', term);
    if (selectedCats.size) params.set('category', [...selectedCats].join(','));
    if (sort !== 'recommended') params.set('sort', sort);
    if (availFrom && availTo) { params.set('availableFrom', availFrom); params.set('availableTo', availTo); }
    if (geo.geo) {
      params.set('lat', geo.geo.lat);
      params.set('lng', geo.geo.lng);
      params.set('radius', geo.radiusKm);
    }
    return params;
  }, [query, selectedCats, sort, availFrom, availTo, geo.geo, geo.radiusKm]);

  /* Fetch one page. `append:false` is a fresh search (replace + reset);
     `append:true` is a "Load More" (concat onto the existing list). */
  const fetchPage = useCallback(async (pageNum, { append }) => {
    setIsLoading(true);
    if (append) setIsAppending(true);
    setError('');
    try {
      const data = await apiFetch(`/items?${buildParams(pageNum).toString()}`);
      const batch = data.items || [];
      const pg = data.pagination || {};
      setItems(prev => (append ? [...prev, ...batch] : batch));
      setHasMore(Boolean(pg.hasMore));
      setTotalItems(pg.totalItems ?? batch.length);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
      if (!append) { setItems([]); setHasMore(false); setTotalItems(0); }
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [buildParams]);

  /* NEW SEARCH: any filter change resets to page 1 and refetches the first
     batch, debounced. `catsKey` gives the Set a stable primitive identity. */
  const catsKey = [...selectedCats].sort().join(',');
  useEffect(() => {
    const t = setTimeout(() => { fetchPage(1, { append: false }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, catsKey, sort, availFrom, availTo, geo.geo, geo.radiusKm]);

  /* LOAD MORE: next page, appended. */
  function loadMore() {
    if (isLoading || !hasMore) return;
    fetchPage(page + 1, { append: true });
  }

  function toggleCat(cat) {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function clearAll() {
    setQuery(''); setSelectedCats(new Set());
    setAvailFrom(''); setAvailTo(''); setSort('recommended');
    geo.clearLocation();
  }

  /* lock background scroll while the mobile filter sheet is open */
  useEffect(() => {
    document.body.style.overflow = filtersOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filtersOpen]);

  const hasFilters = query || selectedCats.size || availFrom || availTo || geo.geo;
  const firstLoad = isLoading && !isAppending && items.length === 0;
  /* count of active filters → shown as a badge on the mobile "Filters" button */
  const activeFilterCount =
    (query ? 1 : 0) + selectedCats.size + (availFrom && availTo ? 1 : 0) + (geo.geo ? 1 : 0);

  return {
    items, hasMore, totalItems, isLoading, isAppending, error,
    query, setQuery, selectedCats, toggleCat, sort, setSort,
    availFrom, setAvailFrom, availTo, setAvailTo, openSec, setOpenSec,
    filtersOpen, setFiltersOpen,
    loadMore, clearAll, hasFilters, firstLoad, activeFilterCount,
  };
}
