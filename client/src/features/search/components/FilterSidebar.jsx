import ChevronIcon from '../../../shared/ui/ChevronIcon';

const RADIUS_OPTIONS = [2, 5, 10, 20];

function FilterSection({ title, open, onToggle, children }) {
  return (
    <div className="flt-sec">
      <button className="flt-head" onClick={onToggle}>
        {title} <ChevronIcon className={`flt-chev${open ? ' open' : ''}`} />
      </button>
      {open && <div className="flt-body">{children}</div>}
    </div>
  );
}

export default function FilterSidebar({ search, geo, categories }) {
  const {
    query, setQuery, openSec, setOpenSec, selectedCats, toggleCat,
    availFrom, setAvailFrom, availTo, setAvailTo, hasFilters, clearAll,
    totalItems, filtersOpen, setFiltersOpen, activeFilterCount,
  } = search;
  const {
    addr, setAddr, radiusKm, setRadiusKm, geo: geoCentre,
    geoLoading, addrLoading, geoError, searchByAddress, useMyLocation, clearLocation,
  } = geo;

  return (
    <>
      <button className="cat-filter-btn" onClick={() => setFiltersOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" /></svg>
        סינון{activeFilterCount > 0 && <span className="cat-filter-n">{activeFilterCount}</span>}
      </button>

      <div
        className={`filters-backdrop${filtersOpen ? ' show' : ''}`}
        onClick={() => setFiltersOpen(false)}
        aria-hidden="true"
      />

      <aside className={`filters${filtersOpen ? ' filters--open' : ''}`} id="filters">
        <div className="filters-m-head">
          <span>סינון</span>
          <button className="filters-close" onClick={() => setFiltersOpen(false)} aria-label="סגירה">✕</button>
        </div>

        <div className="flt-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" placeholder="חיפוש פריט…" value={query} onChange={e => setQuery(e.target.value)} aria-label="חיפוש" />
        </div>

        <FilterSection
          title="קרוב אליי"
          open={openSec.near}
          onToggle={() => setOpenSec(s => ({ ...s, near: !s.near }))}
        >
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
              className={`flt-loc-gps${geoCentre ? ' active' : ''}`}
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
            <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} disabled={!geoCentre}>
              {RADIUS_OPTIONS.map(km => <option key={km} value={km}>{km} ק״מ</option>)}
            </select>
          </label>

          {geoLoading && <p className="flt-loc-status">מאתר את מיקומך…</p>}
          {geoCentre && !geoLoading && <p className="flt-loc-status active">מציג פריטים לפי המיקום שנבחר</p>}
          {geoError && <p className="flt-geo-err">{geoError}</p>}
          {geoCentre && <button type="button" className="flt-clear-dates" onClick={clearLocation}>בטל סינון לפי מיקום</button>}
        </FilterSection>

        <FilterSection
          title="קטגוריות"
          open={openSec.cats}
          onToggle={() => setOpenSec(s => ({ ...s, cats: !s.cats }))}
        >
          {categories.map(cat => (
            <label key={cat.value} className="flt-opt">
              <input type="checkbox" checked={selectedCats.has(cat.value)} onChange={() => toggleCat(cat.value)} />
              <i className={`c-${cat.color}`} />
              <span className="flt-opt-label">{cat.value}</span>
            </label>
          ))}
        </FilterSection>

        <FilterSection
          title="זמינות בתאריכים"
          open={openSec.avail}
          onToggle={() => setOpenSec(s => ({ ...s, avail: !s.avail }))}
        >
          <label className="flt-date">מתאריך
            <input type="date" value={availFrom} onChange={e => setAvailFrom(e.target.value)} />
          </label>
          <label className="flt-date">עד תאריך
            <input type="date" value={availTo} min={availFrom || undefined} onChange={e => setAvailTo(e.target.value)} />
          </label>
          {(availFrom || availTo) && (
            <button className="flt-clear-dates" onClick={() => { setAvailFrom(''); setAvailTo(''); }}>נקה תאריכים</button>
          )}
        </FilterSection>

        {hasFilters && <button className="flt-clear" onClick={clearAll}>נקה את כל הסינונים ✕</button>}

        <button className="filters-apply" onClick={() => setFiltersOpen(false)}>
          הצגת {totalItems} פריטים
        </button>
      </aside>
    </>
  );
}
