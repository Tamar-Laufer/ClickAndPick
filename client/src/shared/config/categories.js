// Click & Pick item categories — OFFLINE FALLBACK / initial paint only.
// The live source of truth is the admin-managed Category collection, fetched
// via CategoriesContext (GET /api/categories). These defaults mirror the four
// seeded categories (server/seeds/categories.js) so the UI renders instantly
// and still works if the API is unreachable.

export const CATEGORIES = [
  { value: 'כלי עבודה', color: 'coral' },
  { value: 'גינה וחוץ', color: 'green' },
  { value: 'אירועים',   color: 'teal'  },
  { value: 'ניקיון',    color: 'blue'  },
];
