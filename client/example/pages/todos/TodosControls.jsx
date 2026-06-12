import AddItem from '../../shared/AddItem';
import Search from '../../shared/Search';

const TodosControls = ({ newTodo, setNewTodo, onAdd, search, setSearch, searchBy,
  setSearchBy, sortBy, setSortBy, stats, error }) => {
  return (
    <>
      <h2 className="todos-title">My Tasks</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="controls-row">
        <div className="controls-add">
          <AddItem value={newTodo} setValue={setNewTodo} onAdd={onAdd} placeholder="New task" buttonText="Add" />
        </div>
        <div className="controls-search">
          <Search
            search={search}
            setSearch={setSearch}
            searchBy={searchBy}
            setSearchBy={setSearchBy}
            options={[
              { value: 'id', label: 'Search by ID' },
              { value: 'title', label: 'Search by Title' },
              { value: 'completed', label: 'Search by Status' }
            ]}
            placeholder={searchBy === 'completed' ? 'completed / pending' : 'Search...'}
          />
        </div>
        <div className="controls-sort">
          <select className="control-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="id">Sort by ID</option>
            <option value="title">Sort by Title</option>
            <option value="completed">Sort by Status</option>
          </select>
        </div>
      </div>

      {search && <div className="search-info">Found {stats.found} of {stats.total} tasks</div>}
    </>
  );
};

export default TodosControls;
