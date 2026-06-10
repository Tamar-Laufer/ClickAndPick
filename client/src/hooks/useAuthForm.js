import { useState } from 'react';

/* ── useAuthForm ───────────────────────────────────────────────────────────
   Shared state for the auth forms: the form values, a change handler, and the
   error/loading pair. `submit` wraps an async handler with the boilerplate that
   was repeated on every page — preventDefault, clear error, run an optional
   synchronous validate(), toggle loading, and surface a thrown error message. */
export function useAuthForm(initial) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function submit(handler, { validate } = {}) {
    return async (e) => {
      e.preventDefault();
      setError('');
      const message = validate?.(form);
      if (message) { setError(message); return; }
      setLoading(true);
      try {
        await handler(form);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  }

  return { form, setForm, handleChange, error, setError, loading, submit };
}
