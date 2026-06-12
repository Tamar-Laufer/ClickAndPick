const Search = ({
  search, setSearch,
  searchBy, setSearchBy,
  options = [
    { value: 'id',    label: 'Search by ID' },
    { value: 'title', label: 'Search by Title' }
  ],
  placeholder = 'Search...'
}) => (
  <div className="search-section">
    <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>

    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} />

    {search && <button onClick={() => setSearch('')}>×</button>}
  </div>
);

Search.filter = (items, search, searchBy) => {
  if (!search.trim()) return items;
  const term = search.toLowerCase();
  return items.filter(item => {
    if (searchBy === 'id')        return item.id.toString().includes(term);
    if (searchBy === 'title')     return item.title.toLowerCase().includes(term);
    if (searchBy === 'completed') {
      return ['completed', 'true'].includes(term) ? item.completed :
        ['pending', 'false'].includes(term) ? !item.completed : false;
    }
    return true;
  });
};

export default Search;
