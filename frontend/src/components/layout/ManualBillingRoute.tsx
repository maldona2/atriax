import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ManualBillingRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (user?.billingMode !== 'manual_transfer') {
    return <Navigate to="/app/profile?tab=subscription" replace />;
  }

  return children;
}
