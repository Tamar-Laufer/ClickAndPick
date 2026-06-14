import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../../shared/services/api';

export const PAGE_SIZE = 12;

export default function useItemSearch(geo) {
  const { q: qParam = '' } = useParams();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);     
  const [isAppending, setIsAppending] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState(decodeURIComponent(qParam) === '-' ? '' : decodeURIComponent(qParam));
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sort, setSort] = useState('newest'); 
  const [availFrom, setAvailFrom] = useState('');
  const [availTo, setAvailTo] = useState('');
  const [openSec, setOpenSec] = useState({ cats: true, avail: true, near: true });
  const [filtersOpen, setFiltersOpen] = useState(false); 

  const buildParams = (pageNum) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
    const term = query.trim();
    if (term) params.set('q', term);
    if (selectedCats.size) params.set('category', [...selectedCats].join(','));
    if (sort !== 'newest') params.set('sort', sort); 
    if (availFrom && availTo) { params.set('availableFrom', availFrom); params.set('availableTo', availTo); }
    if (geo.geo) {
      params.set('lat', geo.geo.lat);
      params.set('lng', geo.geo.lng);
      params.set('radius', geo.radiusKm);
    }
    return params;
  };

  const fetchPage = async (pageNum, { append }) => {
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
  };

  const catsKey = [...selectedCats].sort().join(',');
  useEffect(() => {
    const t = setTimeout(() => { fetchPage(1, { append: false }); }, 250);
    return () => clearTimeout(t);
  }, [query, catsKey, sort, availFrom, availTo, geo.geo, geo.radiusKm]);

  const loadMore = () => {
    if (isLoading || !hasMore) return;
    fetchPage(page + 1, { append: true });
  };

  const toggleCat = (cat) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearAll = () => {
    setQuery(''); setSelectedCats(new Set());
    setAvailFrom(''); setAvailTo(''); setSort('newest');
    geo.clearLocation();
  };


  const hasFilters = query || selectedCats.size || availFrom || availTo || geo.geo;
  const firstLoad = isLoading && !isAppending && items.length === 0;
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
