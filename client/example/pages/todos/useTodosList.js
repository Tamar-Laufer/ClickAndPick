import { useState, useEffect } from 'react';
import { useAuth }     from '../../auth/AuthContext';
import useResource     from '../../hooks/useResource';
import useLocalStorage from '../../hooks/useLocalStorage';
import Search          from '../../shared/Search';

const sortItems = (list, by) => [...list].sort((a, b) => {
  if (by === 'id')        return Number(a.id) - Number(b.id);
  if (by === 'title')     return a.title.localeCompare(b.title);
  if (by === 'completed') return Number(a.completed) - Number(b.completed);
  return 0;
});

const useTodosList = () => {
  const { user } = useAuth();
  const { items: todos, load, add, save, del } = useResource('/todos');

  const [newTodo,  setNewTodo]  = useLocalStorage('newTodoInput', '');
  const [search,   setSearch]   = useLocalStorage('todosSearch', '');
  const [searchBy, setSearchBy] = useLocalStorage('todosSearchBy', 'title');
  const [sortBy,   setSortBy]   = useLocalStorage('todosSortBy', 'id');

  const [editId,    setEditId]    = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (user?.id) load(`?userId=${user.id}`)
      .catch(() => setError('Failed to load tasks'));
  }, [user?.id]);

  const list          = todos || [];
  const filteredTodos = Search.filter(list, search, searchBy);
  const sortedTodos   = sortItems(filteredTodos, sortBy);

  const completed = list.filter(t => t.completed).length;
  const stats = { completed, pending: list.length - completed, total: list.length, found: filteredTodos.length };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    add({ userId: user.id, title: newTodo, completed: false },
      () => { setNewTodo(''); setError(''); });
  };

  const removeTodo = (id) => del(id, null, () => setError(''));

  const toggleComplete = (todo) =>
    save(todo.id, { ...todo, completed: !todo.completed }, () => setError(''));

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    const todo = list.find(t => t.id == editId);
    await save(editId, { ...todo, title: editTitle },
      () => { setEditId(null); setError(''); });
  };

  const startEdit  = (id, title) => { setEditId(id); setEditTitle(title); };
  const cancelEdit = ()          => setEditId(null);

  return {
    user,
    loading: todos === null,
    error,
    sortedTodos, stats,
    search, searchBy, setSearch, setSearchBy,
    sortBy, setSortBy,
    newTodo, setNewTodo,
    editId, editTitle, setEditTitle,
    addTodo, removeTodo, toggleComplete, saveEdit, startEdit, cancelEdit
  };
};

export default useTodosList;
