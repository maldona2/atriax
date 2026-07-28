import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPaymentMethodAnalytics } from '@/lib/debtDashboardApi';
import type { PaymentMethodAnalytics } from '@/types/debtDashboard';

export function usePaymentMethodAnalytics(
  startDate?: string,
  endDate?: string
) {
  const [data, setData] = useState<PaymentMethodAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await fetchPaymentMethodAnalytics(startDate, endDate);
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load payment method analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    fetch();
    intervalRef.current = setInterval(fetch, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
