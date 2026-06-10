import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { CategoriesProvider } from './context/CategoriesProvider';
import ProtectedRoute   from './components/layout/ProtectedRoute';

import HomePage       from './pages/HomePage';
import AboutPage      from './pages/AboutPage';
import SearchResults  from './pages/SearchResults';
import ItemPage       from './pages/ItemPage';
import CreateItem     from './pages/CreateItem';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage  from './pages/ResetPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage    from './pages/ProfilePage';
import CheckoutPage   from './pages/CheckoutPage';
import SuccessPage    from './pages/SuccessPage';

export default function App() {
  return (
    <AuthProvider>
      <CategoriesProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/about"            element={<AboutPage />} />
          <Route path="/search"           element={<SearchResults />} />
          <Route path="/search/:q"        element={<SearchResults />} />
          <Route path="/search/:q/:city"  element={<SearchResults />} />
          <Route path="/item/:id"         element={<ItemPage />} />
          <Route
            path="/items/new"
            element={
              <ProtectedRoute>
                <CreateItem />
              </ProtectedRoute>
            }
          />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token"  element={<ResetPasswordPage />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/success"
            element={
              <ProtectedRoute>
                <SuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </CategoriesProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="page-fallback" dir="rtl">
      <h2>404 – הדף לא נמצא</h2>
      <a href="/">חזרה לדף הבית</a>
    </div>
  );
}
