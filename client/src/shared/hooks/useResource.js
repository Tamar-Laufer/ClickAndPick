import useApi from './useApi';

const useResource = (path) => {
  const { apiCall, execute, loading, error, setError } = useApi();

  const get    = (suffix = '') => execute(() => apiCall(`${path}${suffix}`));
  const create = (data)        => execute(() => apiCall(path, { method: 'POST', body: JSON.stringify(data) }));
  const update = (id, data)    => execute(() => apiCall(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
  const remove = (id)          => execute(() => apiCall(`${path}/${id}`, { method: 'DELETE' }));

  return { loading, error, setError, get, create, update, remove };
};

export default useResource;
