import { useState } from 'react';
import { useAsyncAction } from './useAsyncAction';

/* ── useAuthForm ───────────────────────────────────────────────────────────
   Shared state for the auth forms: the form values and a change handler, on top
   of the generic useAsyncAction loading/error pair. `submit` adds the form-only
   bits — preventDefault and an optional synchronous validate() that short-
   circuits before the request — then delegates the async run to useAsyncAction. */
export function useAuthForm(initial) {
  const [form, setForm] = useState(initial);
  const { run, loading, error, setError } = useAsyncAction((handler) => handler(form));

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function submit(handler, { validate } = {}) {
    return (e) => {
      e.preventDefault();
      const message = validate?.(form);
      if (message) { setError(message); return; }
      run(handler);
    };
  }

  return { form, setForm, handleChange, error, setError, loading, submit };
}
