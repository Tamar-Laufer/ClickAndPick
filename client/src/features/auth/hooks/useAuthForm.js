import { useState } from 'react';
import useAsyncAction from '../../../shared/hooks/useAsyncAction';

export default function useAuthForm(initial) {
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
