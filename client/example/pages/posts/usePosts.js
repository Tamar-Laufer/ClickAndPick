import { useState, useEffect } from 'react';
import { useAuth }     from '../../auth/AuthContext';
import useResource     from '../../hooks/useResource';
import useUsers        from '../../hooks/useUsers';
import useLocalStorage from '../../hooks/useLocalStorage';
import Search          from '../../shared/Search';

const LIMIT = 5;

const usePosts = () => {
  const { user } = useAuth();
  const { items: posts, setItems: setPosts, add, save, del, get } = useResource('/posts');
  const { fetchUsers } = useUsers();

  const [users,   setUsers]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const [newPost,  setNewPost]  = useLocalStorage('newPostInput', { title: '', body: '' });
  const [search,   setSearch]   = useLocalStorage('postsSearch', '');
  const [searchBy, setSearchBy] = useLocalStorage('postsSearchBy', 'title');

  const [expanded,      setExpanded]      = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editData,      setEditData]      = useState({});

  useEffect(() => {
    Promise.all([get(`?_start=0&_limit=${LIMIT}`), fetchUsers()])
      .then(([loaded, loadedUsers]) => {
        setPosts(loaded || []);
        setUsers(loadedUsers || []);
        setHasMore((loaded?.length ?? 0) === LIMIT);
        setLoading(false);
      });
  }, []);

  const loadPage = async (pageNum) => {
    const loaded = await get(`?_start=${(pageNum - 1) * LIMIT}&_limit=${LIMIT}`);
    setPosts(prev => [...prev, ...(loaded || [])]);
    setHasMore((loaded?.length ?? 0) === LIMIT);
    setPage(pageNum);
    setLoading(false);
  };

  const loadMore = () => loadPage(page + 1);

  const list          = posts || [];
  const filteredPosts = Search.filter(list, search, searchBy);

  const getUserName = (userId) => users.find(u => u.id == userId)?.name || 'Unknown';

  const toggleBody = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const addPost = () => {
    if (!newPost.title.trim() || !newPost.body.trim()) return;
    add({ ...newPost, userId: user.id }, () => setNewPost({ title: '', body: '' }));
  };

  const startEditPost  = (post)       => { setEditingPostId(post.id); setEditData({ title: post.title, body: post.body }); };
  const cancelEditPost = ()           => setEditingPostId(null);
  const changeEditPost = (field, val) => setEditData(prev => ({ ...prev, [field]: val }));

  const savePost   = (post)   => save(post.id, { ...post, ...editData }, () => setEditingPostId(null));
  const deletePost = (postId) => del(postId, { userId: user.id });

  return {
    user, loading, filteredPosts, hasMore, getUserName, loadMore,
    newPost, setNewPost, addPost,
    search, setSearch, searchBy, setSearchBy,
    expanded, toggleBody,
    editingPostId, editData, changeEditPost, startEditPost, cancelEditPost, savePost, deletePost
  };
};

export default usePosts;
