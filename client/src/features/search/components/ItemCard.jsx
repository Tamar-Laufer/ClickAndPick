import { Link } from 'react-router-dom';
import { priceText, distanceLabel } from '../../../shared/utils/format';
import { PAGE_SIZE } from '../hooks/useItemSearch';

export default function ItemCard({ item, index }) {
  const price = priceText(item);
  const imgSrc = item.imageUrl || null;
  const dist = distanceLabel(item.distanceInMeters);

  return (
    <Link className="card" to={`/item/${item.id}`} style={{ '--card-i': index % PAGE_SIZE }}>
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
}
