import { Navigate } from 'react-router-dom';
import useTodosList from './useTodosList';
import Layout from '../../shared/Layout';
import TodosControls from './TodosControls';
import TodoItem from './TodoItem';
import './Todos.css';

const Todos = () => {
  const {
    user, loading, error,
    sortedTodos, stats, search, searchBy, setSearch, setSearchBy,
    sortBy, setSortBy, newTodo, setNewTodo,
    editId, editTitle, setEditTitle,
    addTodo, removeTodo, toggleComplete, saveEdit, startEdit, cancelEdit
  } = useTodosList();

  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <Layout>
      <h2 className="todos-title">My Tasks</h2>
      <div>Loading...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="todos-content">
        <TodosControls
          newTodo={newTodo}
          setNewTodo={setNewTodo}
          onAdd={addTodo}
          search={search}
          setSearch={setSearch}
          searchBy={searchBy}
          setSearchBy={setSearchBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
          stats={{ found: stats.found, total: stats.total }}
          error={error}
        />

        {sortedTodos.length === 0 ? (
          <div className="empty-message">{search ? 'No tasks found' : 'No tasks yet'}</div>
        ) : (
          sortedTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isEditing={editId === todo.id}
              editTitle={editTitle}
              onToggle={toggleComplete}
              onStartEdit={startEdit}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onDelete={removeTodo}
              setEditTitle={setEditTitle}
            />
          ))
        )}
      </div>
    </Layout>
  );
};

export default Todos;
