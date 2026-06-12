import { useState } from 'react';
import useApi from './useApi';

const useResource = (path) => {
  const { apiCall, execute, loading, error } = useApi();
  const [items, setItems] = useState(null);

  const get = (suffix = '') => execute(() => apiCall(`${path}${suffix}`));

  const create = (data) => execute(() => apiCall(path, {
    method: 'POST',
    body: JSON.stringify(data)
  }));

  const update = (id, data, suffix = '') => execute(() => apiCall(`${path}/${id}${suffix}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }));

  const remove = (id, body) => execute(() => apiCall(`${path}/${id}`, {
    method: 'DELETE',
    ...(body && { body: JSON.stringify(body) })
  }));

  const load = async (query = '') => setItems((await get(query)) || []);

  const add = async (data, onSuccess) => {
    try {
      const created = await create(data);
      setItems(p => [...(p || []), created]);
      onSuccess?.();
      return created;
    } catch {}
  };

  const save = async (id, data, onSuccess, suffix = '') => {
    try {
      const updated = await update(id, data, suffix);
      setItems(p => (p || []).map(i => i.id == id ? updated : i));
      onSuccess?.(updated);
      return updated;
    } catch {}
  };

  const del = async (id, body, onSuccess) => {
    try {
      await remove(id, body);
      setItems(p => (p || []).filter(i => i.id != id));
      onSuccess?.();
    } catch {}
  };

  return { items, setItems, get, create, update, remove, load, add, save, del, apiCall, execute, loading, error };
};

export default useResource;
