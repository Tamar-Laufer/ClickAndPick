import { useState } from 'react';
import { useCategories } from '../../../shared/context/CategoriesContext';
import useResource from '../../../shared/hooks/useResource';

const useCategoryForm = () => {
  const { categories, addCategory } = useCategories();
  const { create, loading: busy, error: err } = useResource('/categories');
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('coral');

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || busy) return;
    const result = await create({ value: trimmed, color });
    if (!result) return; // create failed → message already in `err`
    addCategory(result.category);
    setLabel('');
    setColor('coral');
  };

  return { categories, label, setLabel, color, setColor, busy, err, handleAdd };
};

export default useCategoryForm;
