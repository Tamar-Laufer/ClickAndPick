// Click & Pick item categories — OFFLINE FALLBACK / initial paint only.
// The live source of truth is the admin-managed Category collection, fetched
// via CategoriesContext (GET /api/categories). These defaults mirror the four
// seeded categories (server/seeds/categories.js) so the UI renders instantly
// and still works if the API is unreachable.

export const CATEGORIES = [
  { value: 'TOOLS',    label: 'כלי עבודה', color: 'coral' },
  { value: 'CAMPING',  label: 'גינון וחוץ', color: 'green' },
  { value: 'EVENTS',   label: 'אירועים',   color: 'teal'  },
  { value: 'CLEANING', label: 'ניקיון',    color: 'blue'  },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
