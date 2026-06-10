import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// מגן על נתיבים – מפנה ל-/login אם לא מחובר, או אם התפקיד לא מתאים.
// שומר את היעד המקורי ב-state.from כדי שאחרי ההתחברות נחזור אליו
// (כך שכפתור במייל → /profile → התחברות → חוזר ל-/profile).
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading">טוען...</div>;
  if (!user)   return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/" replace />;

  return children;
}
