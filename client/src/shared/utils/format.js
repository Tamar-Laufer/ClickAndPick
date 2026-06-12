export function fullName(person, fallback = '') {
  if (!person) return fallback;
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || fallback;
}

export function priceParts(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return { main: `₪${d.toFixed(0)}`, unit: '/ ליום' };
  if (d === 0) return { main: 'חינם', unit: '' };
  return { main: 'לפי תיאום', unit: '' };
}

export function priceText(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return `₪${d.toFixed(0)} ליום`;
  if (d === 0) return 'חינם';
  return 'לפי תיאום';
}

export function distanceLabel(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  const rounded = Math.round((meters / 1000) * 2) / 2; // nearest 0.5 km
  if (rounded < 0.5) return 'פחות מ-0.5 ק״מ ממך';
  const num = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `כ-${num} ק״מ ממך`;
}
