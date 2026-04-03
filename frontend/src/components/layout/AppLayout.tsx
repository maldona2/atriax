import { Outlet } from 'react-router-dom';
import {
  Calendar,
  Syringe,
  Users,
  BarChart2,
  HelpCircle,
  Settings,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from './DashboardShell';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { ChatbotWidget } from '@/components/chatbot/ChatbotWidget';

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
          {
            to: '/app/debt-dashboard',
            label: 'Deudas',
            icon: BarChart2,
          },
          { to: '/app/help', label: 'Ayuda', icon: HelpCircle },
        ] as const)
      : ([
          { to: '/app/appointments', label: 'Turnos', icon: Calendar },
          { to: '/app/patients', label: 'Pacientes', icon: Users },
          {
            to: '/app/profile?tab=treatments',
            label: 'Tratamientos',
            icon: Syringe,
          },
          {
            to: '/app/debt-dashboard',
            label: 'Deudas',
            icon: BarChart2,
          },
          { to: '/app/help', label: 'Ayuda', icon: HelpCircle },
          { to: '/app/profile', label: 'Configuraciones', icon: Settings },
        ] as const);

  return (
    <>
      <DashboardShell
        sidebarItems={sidebarItems}
        onLogout={logout}
        userEmail={user?.email}
        userName={user?.fullName}
      >
        <Outlet />
      </DashboardShell>
      <ChatbotWidget />
    </>
  );
}
