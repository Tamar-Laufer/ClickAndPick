import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthProvider';
import { CategoriesProvider } from './shared/context/CategoriesProvider';
import ProtectedRoute   from './shared/layout/ProtectedRoute';

import HomePage       from './features/marketing/pages/HomePage';
import AboutPage      from './features/marketing/pages/AboutPage';
import TermsPage      from './features/marketing/pages/TermsPage';
import SearchResults  from './features/search/pages/SearchResults';
import ItemPage       from './features/items/pages/ItemPage';
import CreateItem     from './features/items/pages/CreateItem';
import LoginPage      from './features/auth/pages/LoginPage';
import RegisterPage   from './features/auth/pages/RegisterPage';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage  from './features/auth/pages/ResetPasswordPage';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import ProfilePage    from './features/profile/pages/ProfilePage';
import CheckoutPage   from './features/booking/pages/CheckoutPage';
import SuccessPage    from './features/booking/pages/SuccessPage';

export default function App() {
  return (
    <AuthProvider>
      <CategoriesProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/about"            element={<AboutPage />} />
          <Route path="/terms"            element={<TermsPage />} />
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
      <Link to="/">חזרה לדף הבית</Link>
    </div>
  );
}
