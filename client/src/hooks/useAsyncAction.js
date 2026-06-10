import { useCallback, useState } from 'react';

/* ── useAsyncAction ────────────────────────────────────────────────────────
   Wraps an async function with the loading/error boilerplate that every submit
   handler repeated: clear the error, flip `loading` on, run the action, surface
   a thrown Error's message, and flip `loading` off in a finally.

   The action keeps its own success side-effects (navigate, close a modal, patch
   state); `throw new Error(msg)` inside it to show a validation or request error.
   `run` forwards its arguments to the action, so it can be used directly as an
   onSubmit handler (the event is passed straight through).                     */
export function useAsyncAction(action) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (...args) => {
    setError('');
    setLoading(true);
    try {
      return await action(...args);
    } catch (err) {
      setError(err.message || 'אירעה שגיאה');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [action]);

  return { run, loading, error, setError };
}
