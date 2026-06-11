import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDashboard } from './useDashboard';
import api from '@/lib/api';
import type { DashboardData } from '@/types/dashboard';

vi.mock('@/lib/api');
const mockApi = api as any;

const sample: DashboardData = {
  todayAppointments: [],
  cycleAlerts: { upcoming: [], overdue: [] },
  kpis: {
    todayCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    todayRevenueCents: 0,
  },
  debtSummary: { totalPendingCents: 0, patientCount: 0 },
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches dashboard data on mount', async () => {
    mockApi.get.mockResolvedValue({ data: sample });
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(sample);
    expect(result.current.error).toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith('/dashboard');
  });

  it('sets an error message when the request fails', async () => {
    mockApi.get.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('No se pudo cargar el panel');
  });

  it('refetches when refetch is called', async () => {
    mockApi.get.mockResolvedValue({ data: sample });
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});
