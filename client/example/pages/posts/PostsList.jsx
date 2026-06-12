import Search  from '../../shared/Search';
import AddItem from '../../shared/AddItem';
import PostItem from './PostItem';

const PostsList = ({ page }) => {
  const {
    filteredPosts, hasMore, loading, loadMore,
    newPost, setNewPost, addPost,
    search, setSearch, searchBy, setSearchBy
  } = page;

  return (
    <>
      <h2>All Posts</h2>

      <div className="add-post-section">
        <input
          placeholder="Title"
          value={newPost.title}
          onChange={(e) => setNewPost(p => ({ ...p, title: e.target.value }))}
        />
        <AddItem
          value={newPost.body}
          setValue={(val) => setNewPost(p => ({ ...p, body: val }))}
          onAdd={addPost}
          placeholder="Content"
          buttonText="Add"
          multiline
        />
      </div>

      <Search
        search={search}
        setSearch={setSearch}
        searchBy={searchBy}
        setSearchBy={setSearchBy}
        options={[{ value: 'id', label: 'ID' }, { value: 'title', label: 'Title' }]}
        placeholder="Search posts..."
      />

      {filteredPosts.map(post => (
        <PostItem key={post.id} post={post} page={page} />
      ))}

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More Posts'}
        </button>
      )}
      {!hasMore && filteredPosts.length > 0 && (
        <div className="no-more-posts">No more posts to load</div>
      )}
    </>
  );
};

export default PostsList;
