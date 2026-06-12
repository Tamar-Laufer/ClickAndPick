import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Layout from '../../shared/Layout';
import './Home.css';

const StatCard = ({ label, value, sub, color, onClick }) => (
  <div className={`stat-card stat-card--${color}`} onClick={onClick}>
    <div className="stat-value">{value ?? '—”'}</div>
    <div className="stat-label">{label}</div>
    {sub !== undefined && <div className="stat-sub">{sub}</div>}
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchStats = async () => {
      try {
        const [todos, myPosts] = await Promise.all([
          fetch(`http://localhost:3001/todos?userId=${user.id}`).then(r => r.json()),
          fetch(`http://localhost:3001/posts?userId=${user.id}`).then(r => r.json())
        ]);
        const done = todos.filter(t => t.completed).length;
        setStats({ todos: todos.length, done, pending: todos.length - done, posts: myPosts.length });
      } catch { setStats({ todos: 0, done: 0, pending: 0, posts: 0 }); }
    };
    fetchStats();
  }, [user?.id]);

  return (
    <Layout>
      <div className="home-content">

        <div className="home-banner">
          <div className="home-banner__left">
            <div className="home-banner__greeting">Good day,</div>
            <h1 className="home-banner__name">{user?.name || user?.username}</h1>
            <p className="home-banner__sub">Here's what's happening in your workspace.</p>
          </div>
          <div className="home-banner__avatar">
            {(user?.name || user?.username || '?')[0].toUpperCase()}
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="My Tasks"  value={stats?.todos}   sub={`${stats?.done} completed`} color="blue"   onClick={() => navigate(`/users/${user.username}/todos`)} />
          <StatCard label="Completed" value={stats?.done}    sub={`out of ${stats?.todos}`}   color="green"  onClick={() => navigate(`/users/${user.username}/todos`)} />
          <StatCard label="Pending"   value={stats?.pending} sub="tasks left"                 color="orange" onClick={() => navigate(`/users/${user.username}/todos`)} />
          <StatCard label="My Posts"  value={stats?.posts}                                    color="purple" onClick={() => navigate(`/users/${user.username}/posts`)} />
        </div>

        <div className="home-section-title">Quick Actions</div>
        <div className="quick-actions">
          <div className="quick-action" onClick={() => navigate(`/users/${user.username}/todos`)}>
            <div className="quick-action__icon">✓</div>
            <div className="quick-action__text">
              <div className="quick-action__name">Todos</div>
              <div className="quick-action__desc">Manage your tasks</div>
            </div>
            <div className="quick-action__arrow">→</div>
          </div>
          <div className="quick-action" onClick={() => navigate(`/users/${user.username}/posts`)}>
            <div className="quick-action__icon">✎</div>
            <div className="quick-action__text">
              <div className="quick-action__name">Posts</div>
              <div className="quick-action__desc">Browse all posts & comments</div>
            </div>
            <div className="quick-action__arrow">→</div>
          </div>
        </div>

        <div className="home-section-title">Account</div>
        <div className="user-card">
          <div className="user-card__row"><span>Username</span><strong>{user?.username}</strong></div>
          <div className="user-card__row"><span>Email</span><strong>{user?.email}</strong></div>
          <div className="user-card__row"><span>Phone</span><strong>{user?.phone || '_'}</strong></div>
          <div className="user-card__row"><span>City</span><strong>{user?.address?.city || '_'}</strong></div>
          <div className="user-card__row"><span>Company</span><strong>{user?.company?.name || '_'}</strong></div>
        </div>

      </div>
    </Layout>
  );
};

export default Home;
