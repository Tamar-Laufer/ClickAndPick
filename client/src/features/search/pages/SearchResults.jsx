import { useCategories } from '../../../shared/context/CategoriesContext';
import useGeoSearch from '../hooks/useGeoSearch';
import useItemSearch from '../hooks/useItemSearch';
import TgNavbar from '../../../shared/layout/TgNavbar';
import MiniFooter from '../../../shared/layout/MiniFooter';
import FilterSidebar from '../components/FilterSidebar';
import ItemCard from '../components/ItemCard';
import './SearchResults.css';

export default function SearchResults() {
  const { categories } = useCategories();
  const geo = useGeoSearch();
  const search = useItemSearch(geo);

  const {
    items, hasMore, totalItems, isLoading, isAppending, error,
    sort, setSort, availFrom, availTo, hasFilters, firstLoad, clearAll, loadMore,
  } = search;

  return (
    <div className="tg tg-white" dir="rtl">

      <TgNavbar variant="page" active="items" />

      <main className="catalog">
        <div className="wrap">

          <div className="cat-hero">
            <div>
              <span className="kicker"><span className="idx">01</span> מה תרצו לשאול היום?</span>
              <h1>כל הפריטים </h1>
            </div>
          </div>

          <div className="cat-layout">

            <FilterSidebar search={search} geo={geo} categories={categories} />

            <div className="cat-main">
              <div className="cat-bar">
                <div className="cat-count"><strong>{totalItems}</strong> פריטים{(availFrom && availTo) ? ' · פנויים בתאריכים שבחרת' : ''}</div>
                <label className="cat-sort">
                  מיון:
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="newest">מהחדש לישן</option>
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
                  <p className="cat-empty-title">לא נמצאו פריטים</p>
                  <p className="cat-empty-desc">נסו לשנות את הסינון או מילות החיפוש</p>
                  {hasFilters && <button className="btn btn-accent" onClick={clearAll}>נקה סינונים</button>}
                </div>
              )}

              {!firstLoad && !error && items.length > 0 && (
                <>
                  <div className="grid">
                    {items.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
                  </div>

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

      <MiniFooter />

    </div>
  );
}
