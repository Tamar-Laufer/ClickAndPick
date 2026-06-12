import Edit from '../../shared/Edit';
import DeleteItem from '../../shared/DeleteItem';

const TodoItem = ({ todo, isEditing, editTitle, onToggle, onStartEdit, onSave, onCancel, onDelete, setEditTitle }) => (
  <div className="todo-item">
    <input
      className="todo-checkbox"
      type="checkbox"
      checked={todo.completed}
      onChange={() => onToggle(todo)}
    />
    <span className="todo-id">#{todo.id}</span>

    {isEditing ? (
      <Edit value={editTitle} setValue={setEditTitle} onSave={onSave} onCancel={onCancel} placeholder="Edit task" />
    ) : (
      <>
        <span className={`todo-title ${todo.completed ? 'completed' : ''}`}>
          {todo.title || 'No title'}
        </span>
        <button className="edit-btn" onClick={() => onStartEdit(todo.id, todo.title)}>Edit</button>
        <DeleteItem onDelete={() => onDelete(todo.id)} />
      </>
    )}
  </div>
);

export default TodoItem;
