import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import type { DashboardData } from '@/types/dashboard';

const data: DashboardData = {
  todayAppointments: [],
  cycleAlerts: {
    upcoming: [
      {
        patientTreatmentId: 'pt-1',
        patientId: 'p-1',
        patientName: 'Ana Pérez',
        patientPhone: '+5491100000000',
        treatmentName: 'Botox',
        nextDueDate: '2026-06-15T10:00:00.000Z',
        daysUntilDue: 4,
        lastCycleReminderAt: null,
      },
    ],
    overdue: [],
  },
  kpis: {
    todayCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    todayRevenueCents: 0,
  },
  debtSummary: { totalPendingCents: 0, patientCount: 0 },
};

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({
    data,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('DashboardPage', () => {
  it('renders cycle alerts and section headings', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Recordatorios de ciclo')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Botox')).toBeInTheDocument();
  });
});
