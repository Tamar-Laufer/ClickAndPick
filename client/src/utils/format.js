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
