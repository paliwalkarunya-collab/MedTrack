import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};

export const PermissionRoute = ({ permission }) => {
  const { hasPermission } = useAuth();
  if (hasPermission(permission)) return <Outlet />;
  return <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"><ShieldAlert className="h-10 w-10 text-rose-500" /><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Access denied</h2><p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">Your role does not have permission to access this module.</p></div>;
};

export const PublicOnlyRoute = ({ children }) => useAuth().isAuthenticated ? <Navigate to="/" replace /> : children;
