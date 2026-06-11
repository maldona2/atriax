import { useState, useEffect, useCallback } from 'react';
import { fetchDashboard } from '@/lib/dashboardApi';
import type { DashboardData } from '@/types/dashboard';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDashboard();
      setData(result);
      setError(null);
    } catch {
      setError('No se pudo cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
