import { useState } from 'react';
import useResource from '../../../shared/hooks/useResource';

const useFeedbackForm = () => {
  const { create, loading: busy, error: err } = useResource('/feedback');
  const [form, setForm] = useState({ name: '', email: '', type: 'recommendation', message: '' });
  const [done, setDone] = useState(false);

  const set = (k) => (e) => {
    if (done) setDone(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const result = await create(form);
    if (!result) return; 
    setForm({ name: '', email: '', type: 'recommendation', message: '' });
    setDone(true);
  };

  return { form, done, busy, err, set, submit };
};

export default useFeedbackForm;
