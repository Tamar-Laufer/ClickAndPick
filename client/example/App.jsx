import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { useEffect } from 'react';
import Login    from './auth/Login';
import Register from './auth/Register';
import Home     from './pages/home/Home';
import Todos    from './pages/todos/Todos';
import Posts    from './pages/posts/Posts';
import './App.css';
import './styles/Components.css';
import './styles/ModernComponents.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-container">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const OwnerRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated && username !== user?.username) {
      alert('Access denied - this area does not belong to you');
      navigate('/home', { replace: true });
    }
  }, [loading, isAuthenticated, username, user]);

  if (loading) return <div className="loading-container">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (username !== user?.username) return null;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />

          <Route path="/users/:username/todos" element={
            <OwnerRoute><Todos /></OwnerRoute>
          } />

          <Route path="/users/:username/posts" element={
            <OwnerRoute><Posts /></OwnerRoute>
          } />

          <Route path="/"  element={<Navigate to="/login" replace />} />
          <Route path="*"  element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
