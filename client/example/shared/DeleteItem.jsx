const DeleteItem = ({ onDelete, label = 'Delete' }) => {
  const handleClick = () => {
    if (window.confirm('Are you sure you want to delete?')) {
      onDelete();
    }
  };

  return (
    <button className="delete-btn" onClick={handleClick}>{label}</button>
  );
};

export default DeleteItem;
