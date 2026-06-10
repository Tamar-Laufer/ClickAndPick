import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch }  from '../hooks/useApi';
import { useCategories } from '../context/CategoriesContext';
import TgNavbar from '../components/TgNavbar';
import './SearchResults.css';

/* ── "ביחד" catalog — smart filter sidebar + 3-up grid ──
   Server-side filtering + "Load More" pagination: keyword / category / sort /
   dates / location all become GET /api/items query params, and each batch is
   fetched (and appended) on demand rather than over-fetching the whole catalog. */

const PAGE_SIZE = 12;

const Chevron = ({ open }) => (
  <svg className={`flt-chev${open ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);

function priceLabel(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return `₪${d.toFixed(0)} ליום`;
  if (d === 0) return 'חינם';
  return 'לפי תיאום';
}

/* Privacy-friendly distance: rounds to the nearest 0.5 km so an exact position
   can't be triangulated. e.g. 400m → "פחות מ-0.5 ק״מ", 1300m → "כ-1.5 ק״מ". */
function distanceLabel(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  const rounded = Math.round((meters / 1000) * 2) / 2; // nearest 0.5 km
  if (rounded < 0.5) return 'פחות מ-0.5 ק״מ ממך';
  const num = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `כ-${num} ק״מ ממך`;
}

/* Radius options for the "near me" filter (kilometres). */
const RADIUS_OPTIONS = [2, 5, 10, 20];

export default function SearchResults() {
  const { q: qParam = '' } = useParams();
  const { categories } = useCategories();

  /* ── paginated feed state ── */
  const [items, setItems]         = useState([]);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);    // any fetch in flight (true → mount skeletons)
  const [isAppending, setIsAppending] = useState(false); // a "Load More" fetch
  const [error, setError]         = useState('');

  /* ── filters (all server-driven) ── */
  const [query, setQuery]             = useState(decodeURIComponent(qParam) === '-' ? '' : decodeURIComponent(qParam));
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [sort, setSort]               = useState('recommended');
  const [availFrom, setAvailFrom]     = useState('');
  const [availTo, setAvailTo]         = useState('');
  const [openSec, setOpenSec]         = useState({ cats: true, avail: true, near: true });
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile filter sheet

  /* "near me" geo filter — by typed address OR by current GPS */
  const [geo, setGeo]                 = useState(null);   // { lat, lng } search centre
  const [addr, setAddr]               = useState('');     // typed target address
  const [radiusKm, setRadiusKm]       = useState(5);
  const [geoLoading, setGeoLoading]   = useState(false);  // GPS in flight
  const [addrLoading, setAddrLoading] = useState(false);  // address geocode in flight
  const [geoError, setGeoError]       = useState('');

  /* (A) typed address → ask the backend to geocode it, then search around it.
     Setting `geo` re-triggers the search effect below. */
  async function searchByAddress(e) {
    e?.preventDefault();
    const q = addr.trim();
    if (!q) return;
    setAddrLoading(true); setGeoError('');
    try {
      const { lat, lng } = await apiFetch(`/items/geocode?q=${encodeURIComponent(q)}`);
      setGeo({ lat, lng });
    } catch {
      setGeoError('לא מצאנו את הכתובת הזו. נסו שם עיר או כתובת מלאה יותר.');
    } finally {
      setAddrLoading(false);
    }
  }

  /* (B) current GPS location */
  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeoError('הדפדפן שלך לא תומך באיתור מיקום');
      return;
    }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('לא הצלחנו לאתר את מיקומך. בדקו שהרשאת המיקום מאופשרת.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function clearLocation() { setGeo(null); setAddr(''); setGeoError(''); }

  /* drop the global fixed-navbar spacing — this page has its own topbar */
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

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
    if (geo) {
      params.set('lat', geo.lat);
      params.set('lng', geo.lng);
      params.set('radius', radiusKm);
    }
    return params;
  }, [query, selectedCats, sort, availFrom, availTo, geo, radiusKm]);

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
     batch. Debounced so typing in the keyword box doesn't fire on every key.
     `catsKey` gives the Set a stable primitive identity for the dep array. */
  const catsKey = [...selectedCats].sort().join(',');
  useEffect(() => {
    const t = setTimeout(() => { fetchPage(1, { append: false }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, catsKey, sort, availFrom, availTo, geo, radiusKm]);

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
    clearLocation();
  }

  const hasFilters = query || selectedCats.size || availFrom || availTo || geo;
  const firstLoad = isLoading && !isAppending && items.length === 0;

  /* count of active filters → shown as a badge on the mobile "Filters" button */
  const activeFilterCount =
    (query ? 1 : 0) + selectedCats.size + (availFrom && availTo ? 1 : 0) + (geo ? 1 : 0);

  /* lock background scroll while the mobile filter sheet is open */
  useEffect(() => {
    document.body.style.overflow = filtersOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filtersOpen]);

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

      {/* ════════ CATALOG ════════ */}
      <main className="catalog">
        <div className="wrap">

          <div className="cat-hero">
            <div>
              <span className="kicker"><span className="idx">01</span> מה תרצו לשאול היום?</span>
              <h1>כל הפריטים <span className="accent">בשכונה</span></h1>
            </div>
          </div>

          <div className="cat-layout">

            {/* mobile-only trigger — opens the filter sheet (hidden ≥1001px) */}
            <button className="cat-filter-btn" onClick={() => setFiltersOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
              סינון{activeFilterCount > 0 && <span className="cat-filter-n">{activeFilterCount}</span>}
            </button>

            {/* backdrop behind the mobile sheet */}
            <div
              className={`filters-backdrop${filtersOpen ? ' show' : ''}`}
              onClick={() => setFiltersOpen(false)}
              aria-hidden="true"
            />

            {/* ── filters: sidebar on desktop, bottom-sheet on mobile ── */}
            <aside className={`filters${filtersOpen ? ' filters--open' : ''}`} id="filters">
              {/* sheet header — only visible inside the mobile sheet */}
              <div className="filters-m-head">
                <span>סינון</span>
                <button className="filters-close" onClick={() => setFiltersOpen(false)} aria-label="סגירה">✕</button>
              </div>

              <div className="flt-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input type="search" placeholder="חיפוש פריט…" value={query} onChange={e => setQuery(e.target.value)} aria-label="חיפוש" />
              </div>

              {/* near me — geo radius search */}
              <div className="flt-sec">
                <button className="flt-head" onClick={() => setOpenSec(s => ({ ...s, near: !s.near }))}>
                  קרוב אליי <Chevron open={openSec.near} />
                </button>
                {openSec.near && (
                  <div className="flt-body">
                    {/* (A) typed target address + (B) inline "use my location" GPS button */}
                    <form className="flt-loc" onSubmit={searchByAddress}>
                      <input
                        type="search"
                        className="flt-loc-input"
                        placeholder="עיר או כתובת, למשל תל אביב"
                        value={addr}
                        onChange={e => setAddr(e.target.value)}
                        aria-label="חיפוש לפי כתובת"
                      />
                      <button
                        type="button"
                        className={`flt-loc-gps${geo ? ' active' : ''}`}
                        onClick={useMyLocation}
                        disabled={geoLoading}
                        title="חפש לפי המיקום הנוכחי שלי"
                        aria-label="חפש לפי המיקום הנוכחי שלי"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                      </button>
                    </form>
                    <button type="button" className="flt-loc-go" onClick={searchByAddress} disabled={addrLoading || !addr.trim()}>
                      {addrLoading ? 'מחפש…' : 'חיפוש לפי כתובת'}
                    </button>

                    <label className="flt-radius">
                      רדיוס חיפוש
                      <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} disabled={!geo}>
                        {RADIUS_OPTIONS.map(km => <option key={km} value={km}>{km} ק״מ</option>)}
                      </select>
                    </label>

                    {geoLoading && <p className="flt-loc-status">מאתר את מיקומך…</p>}
                    {geo && !geoLoading && <p className="flt-loc-status active">מציג פריטים לפי המיקום שנבחר</p>}
                    {geoError && <p className="flt-geo-err">{geoError}</p>}
                    {geo && <button type="button" className="flt-clear-dates" onClick={clearLocation}>בטל סינון לפי מיקום</button>}
                  </div>
                )}
              </div>

              {/* categories (server-side filter, multi-select) */}
              <div className="flt-sec">
                <button className="flt-head" onClick={() => setOpenSec(s => ({ ...s, cats: !s.cats }))}>
                  קטגוריות <Chevron open={openSec.cats} />
                </button>
                {openSec.cats && (
                  <div className="flt-body">
                    {categories.map(cat => (
                      <label key={cat.value} className="flt-opt">
                        <input type="checkbox" checked={selectedCats.has(cat.value)} onChange={() => toggleCat(cat.value)} />
                        <i className={`c-${cat.color}`} />
                        <span className="flt-opt-label">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* availability by dates */}
              <div className="flt-sec">
                <button className="flt-head" onClick={() => setOpenSec(s => ({ ...s, avail: !s.avail }))}>
                  זמינות בתאריכים <Chevron open={openSec.avail} />
                </button>
                {openSec.avail && (
                  <div className="flt-body">
                    <label className="flt-date">מתאריך
                      <input type="date" value={availFrom} onChange={e => setAvailFrom(e.target.value)} />
                    </label>
                    <label className="flt-date">עד תאריך
                      <input type="date" value={availTo} min={availFrom || undefined} onChange={e => setAvailTo(e.target.value)} />
                    </label>
                    {(availFrom || availTo) && (
                      <button className="flt-clear-dates" onClick={() => { setAvailFrom(''); setAvailTo(''); }}>נקה תאריכים</button>
                    )}
                  </div>
                )}
              </div>

              {hasFilters && <button className="flt-clear" onClick={clearAll}>נקה את כל הסינונים ✕</button>}

              {/* sheet footer — only visible inside the mobile sheet */}
              <button className="filters-apply" onClick={() => setFiltersOpen(false)}>
                הצגת {totalItems} פריטים
              </button>
            </aside>

            {/* ── results ── */}
            <div className="cat-main">
              <div className="cat-bar">
                <div className="cat-count"><strong>{totalItems}</strong> פריטים{(availFrom && availTo) ? ' · פנויים בתאריכים שבחרת' : ''}</div>
                <label className="cat-sort">
                  מיון:
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="recommended">מומלצים</option>
                    <option value="price-asc">מחיר: מהזול ליקר</option>
                    <option value="price-desc">מחיר: מהיקר לזול</option>
                  </select>
                </label>
              </div>

              {firstLoad && (
                <div className="grid">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="cat-skel" />)}
                </div>
              )}

              {error && <p className="cat-error">{error}</p>}

              {!firstLoad && !error && items.length === 0 && (
                <div className="cat-empty">
                  <div className="cat-empty-ic">🔍</div>
                  <p className="cat-empty-title">לא נמצאו פריטים</p>
                  <p className="cat-empty-desc">נסו לשנות את הסינון או מילות החיפוש</p>
                  {hasFilters && <button className="btn btn-accent" onClick={clearAll}>נקה סינונים</button>}
                </div>
              )}

              {!firstLoad && !error && items.length > 0 && (
                <>
                  <div className="grid">
                    {items.map((item, i) => {
                      const price = priceLabel(item);
                      const imgSrc = item.imageUrl || null;
                      const dist = distanceLabel(item.distanceInMeters);
                      return (
                        /* --card-i drives the staggered entrance; modulo keeps each
                           appended "Load More" batch starting its cascade at 0 */
                        <Link className="card" to={`/item/${item.id}`} key={item.id} style={{ '--card-i': i % PAGE_SIZE }}>
                          <div className="card-media">
                            <div className="card-ph">{item.title ? item.title[0] : '?'}</div>
                            {imgSrc && <img className="card-photo" src={imgSrc} alt={item.title} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                            {dist && (
                              <span className="card-dist">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                                {dist}
                              </span>
                            )}
                          </div>
                          <div className="card-body">
                            <span className="card-name">{item.title}</span>
                            <div className="card-foot">
                              <span className="card-price">{price}</span>
                              {item.totalReviews > 0 && (
                                <span className="card-rating" title={`${Number(item.averageRating).toFixed(1)} מתוך 5 · ${item.totalReviews} ביקורות`}>
                                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" /></svg>
                                  {Number(item.averageRating).toFixed(1)}
                                  <i>({item.totalReviews})</i>
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Load More — only while the backend reports more pages */}
                  {hasMore && (
                    <div className="cat-more">
                      <button className="btn btn-accent" onClick={loadMore} disabled={isLoading}>
                        {isAppending ? 'טוען…' : 'טען פריטים נוספים'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </main>

      <footer className="mini-footer">
        <div className="wrap">
          <img className="mf-logo" src="/images/logo-light.png" alt="Click & Pick" />
          <span>© {new Date().getFullYear()} ביחד · שיתוף שכונתי</span>
        </div>
      </footer>

    </div>
  );
}
