// Wraps routes that need a login (and optionally a specific role).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from './AuthContext';
import { Loader } from '../components/ui';

export default function ProtectedRoute({ roles }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loader full />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
