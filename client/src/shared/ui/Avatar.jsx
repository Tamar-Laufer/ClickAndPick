import { fullName } from '../utils/format';
import './Avatar.css';

export default function Avatar({ user, name, size = 36, className = '', style }) {
  const display = (name || fullName(user) || user?.name || '').trim();
  const initial = (display || '?')[0].toUpperCase();
  const url = user?.avatarUrl;

  const sizeVars = { '--av-size': `${size}px`, '--av-font': `${Math.round(size * 0.42)}px` };

  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ ...sizeVars, ...style }}
      title={display || undefined}
    >
      {url
        ? <img src={url} alt={display || 'תמונת פרופיל'} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        : <span className="avatar-ini">{initial}</span>}
    </span>
  );
}
