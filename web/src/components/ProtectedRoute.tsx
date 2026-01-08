import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard based on role
    const defaultRoute = getDashboardRoute(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};

function getDashboardRoute(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'DOCTOR':
      return '/doctor/queue';
    case 'RECEPTIONIST':
      return '/receptionist/queue';
    case 'PATIENT':
      return '/patient/dashboard';
    default:
      return '/dashboard';
  }
}
