import useResource from './useResource';

const useUsers = () => {
  const { get, create, update } = useResource('/users');

  const fetchUsers        = ()           => get();
  const fetchUser         = (id)         => get(`/${id}`);
  const createUser        = (data)       => create(data);
  const updateUser        = (id, data)   => update(id, data);
 
  return { fetchUsers, fetchUser, createUser, updateUser };
};

export default useUsers;
