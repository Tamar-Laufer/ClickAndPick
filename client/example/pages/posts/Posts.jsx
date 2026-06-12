import { Navigate } from 'react-router-dom';
import usePosts    from './usePosts';
import useComments from './useComments';
import Layout      from '../../shared/Layout';
import PostsList   from './PostsList';
import './Posts.css';

const Posts = () => {
  const postsPage    = usePosts();
  const commentsPage = useComments();
  const page         = { ...postsPage, ...commentsPage };

  if (!page.user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <PostsList page={page} />
    </Layout>
  );
};

export default Posts;
