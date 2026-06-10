/* Shared display-formatting helpers. */

/* Compose a person's display name from { firstName, lastName }, dropping any
   blank parts. Returns `fallback` (default '') when the person is missing or has
   no name parts — so callers can pass a placeholder like 'משתמש' or 'השוכר'.
   Note: this does not consult a pre-composed `name` field; callers that prefer
   one keep their explicit `person.name || fullName(person)` ordering. */
export function fullName(person, fallback = '') {
  if (!person) return fallback;
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || fallback;
}

/* Daily-rate display, split into a big number + its unit so cards/detail pages
   can style them separately. Paid → { '₪30', '/ ליום' }, zero → free, missing
   or negative → "by arrangement". (Was duplicated as getPrice/priceLabel in
   ItemPage and HomePage.) */
export function priceParts(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return { main: `₪${d.toFixed(0)}`, unit: '/ ליום' };
  if (d === 0) return { main: 'חינם', unit: '' };
  return { main: 'לפי תיאום', unit: '' };
}

/* Same rate as one flat string, for the catalog cards: "₪30 ליום" / "חינם" /
   "לפי תיאום". */
export function priceText(item) {
  const d = Number(item.dailyRate);
  if (d > 0) return `₪${d.toFixed(0)} ליום`;
  if (d === 0) return 'חינם';
  return 'לפי תיאום';
}

/* Privacy-friendly distance: rounds to the nearest 0.5 km so an exact position
   can't be triangulated. e.g. 400m → "פחות מ-0.5 ק״מ", 1300m → "כ-1.5 ק״מ".
   Returns null when no distance is available (no location filter active). */
export function distanceLabel(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  const rounded = Math.round((meters / 1000) * 2) / 2; // nearest 0.5 km
  if (rounded < 0.5) return 'פחות מ-0.5 ק״מ ממך';
  const num = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `כ-${num} ק״מ ממך`;
}
