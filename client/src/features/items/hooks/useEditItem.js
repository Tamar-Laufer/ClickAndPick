import { useState, useRef } from 'react';
import { useCategories } from '../../../shared/context/CategoriesContext';
import useResource from '../../../shared/hooks/useResource';
import useImageUpload from '../../../shared/hooks/useImageUpload';

const useEditItem = ({ item, token, onClose, onSaved }) => {
  const { categories } = useCategories();
  const { update, loading: saving, error, setError } = useResource('/items');
  const [form, setForm] = useState({
    title: item.title || '',
    description: item.description || '',
    category: item.category || (categories[0]?.value ?? ''),
    dailyRate: item.dailyRate ?? '',
    address: '',
  });
  const { imageUrl, uploading, handleFile } = useImageUpload(token, { initialUrl: item.imageUrl || '', onError: setError });
  const fileRef = useRef(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('שם הפריט הוא שדה חובה'); return; }
    const result = await update(item.id, {
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      dailyRate: Number(form.dailyRate) || 0,
      imageUrl,
      ...(form.address.trim() ? { address: form.address.trim() } : {}),
    });
    if (!result) return; 
    onSaved(result.item); 
    onClose();
  };

  return { categories, form, imageUrl, uploading, saving, error, fileRef, handleChange, handleFile, handleSubmit };
};

export default useEditItem;
