import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import useResource from '../../../shared/hooks/useResource';
import useImageUpload from '../../../shared/hooks/useImageUpload';

const useCreateItem = () => {
  const { token } = useAuth();
  const { create, loading, error, setError } = useResource('/items');
  const { imageUrl, uploading, handleFile } = useImageUpload(token, { onError: setError });
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ title: '', description: '', category: 'TOOLS', dailyRate: '', address: '' });

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, dailyRate: Number(form.dailyRate), imageUrl };
    const data = await create(payload);
    if (!data) return;
    navigate(`/item/${data.item.id}`);
  };

  return { form, imageUrl, uploading, loading, error, fileRef, handleChange, handleFile, handleSubmit };
};

export default useCreateItem;
