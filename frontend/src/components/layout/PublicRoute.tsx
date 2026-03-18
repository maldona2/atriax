import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps public-only pages (landing, login, register).
 * Redirects authenticated users to their dashboard so they never see
 * login CTAs after already having a session.
 */
export function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'super_admin') {
      return <Navigate to="/admin/tenants" replace />;
    }
    return <Navigate to="/app/appointments" replace />;
  }

  return <>{children}</>;
}
