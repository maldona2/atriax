import { Outlet } from 'react-router-dom';
import { Calendar, Syringe, Users } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from './DashboardShell';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { useSubscription } from '@/hooks/useSubscription';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { status } = useSubscription();
  useAppointmentNotifications();

  const sidebarItems =
    status?.features?.appointments === false
      ? ([
          { to: '/app/patients', label: 'Pacientes', icon: Users },
          {
            to: '/app/profile?tab=treatments',
            label: 'Tratamientos',
            icon: Syringe,
          },
        ] as const)
      : ([
          { to: '/app/appointments', label: 'Turnos', icon: Calendar },
          { to: '/app/patients', label: 'Pacientes', icon: Users },
          {
            to: '/app/profile?tab=treatments',
            label: 'Tratamientos',
            icon: Syringe,
          },
        ] as const);

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      onLogout={logout}
      userEmail={user?.email}
      userName={user?.fullName}
    >
      <Outlet />
    </DashboardShell>
  );
}
