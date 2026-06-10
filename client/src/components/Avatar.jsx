import './Avatar.css';

/* Shared profile avatar — shows the user's uploaded photo when present,
   otherwise a coloured circle with their first initial. Used everywhere a
   person appears (navbar, booking cards, reviews, owner blocks, admin lists)
   so a member looks the same across the whole site.

   Props:
     user  — an object that may carry { avatarUrl, firstName, lastName, name }
     name  — explicit display name (overrides the user-derived one)
     size  — diameter in px (default 36)
     className — extra classes for layout tweaks
     style — extra inline styles (e.g. a fallback background colour) */
export default function Avatar({ user, name, size = 36, className = '', style }) {
  const display = (name
    || (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name : '')
    || '').trim();
  const initial = (display || '?')[0].toUpperCase();
  const url = user?.avatarUrl;

  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...style }}
      title={display || undefined}
    >
      {url
        ? <img src={url} alt={display || 'תמונת פרופיל'} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        : <span className="avatar-ini">{initial}</span>}
    </span>
  );
}
