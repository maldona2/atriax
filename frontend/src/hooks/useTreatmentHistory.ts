import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { TreatmentHistoryResponse } from '@/types/treatments';

// Cache for treatment history data (Requirement 10.4)
const treatmentHistoryCache = new Map<
  string,
  {
    data: TreatmentHistoryResponse;
    timestamp: number;
  }
>();

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

export function useTreatmentHistory(patientId: string | null) {
  const [treatmentHistory, setTreatmentHistory] =
    useState<TreatmentHistoryResponse | null>(null);
  // Start with loading true if we have a patientId
  const [loading, setLoading] = useState(!!patientId);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTreatmentHistory = useCallback(async () => {
    if (!patientId) {
      setTreatmentHistory(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first (Requirement 10.4)
    const cached = treatmentHistoryCache.get(patientId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      setTreatmentHistory(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      const { data } = await api.get<TreatmentHistoryResponse>(
        `/patients/${patientId}/treatment-history`,
        {
          signal: abortControllerRef.current.signal,
        }
      );

      // Update cache (Requirement 10.4)
      treatmentHistoryCache.set(patientId, {
        data,
        timestamp: now,
      });

      setTreatmentHistory(data);
      setError(null);
    } catch (err) {
      // Ignore cancellations (fetch AbortError + axios CanceledError). These
      // fire when a pending request is aborted (e.g. React StrictMode's
      // double-mount), and must not surface as a user-facing error — nor flip
      // loading off while the replacement request is still in flight.
      const e = err as { name?: string; code?: string };
      cancelled =
        e?.name === 'AbortError' ||
        e?.name === 'CanceledError' ||
        e?.code === 'ERR_CANCELED';
      if (cancelled) {
        return;
      }

      const errorMessage =
        err instanceof Error
          ? err
          : new Error('Error al cargar el registro de tratamientos');
      setError(errorMessage);
      setTreatmentHistory(null);
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }, [patientId]);

  useEffect(() => {
    fetchTreatmentHistory();

    // Cleanup: abort pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTreatmentHistory]);

  const refetch = useCallback(async () => {
    // Clear cache for this patient to force fresh data
    if (patientId) {
      treatmentHistoryCache.delete(patientId);
    }
    await fetchTreatmentHistory();
  }, [patientId, fetchTreatmentHistory]);

  return {
    treatmentHistory,
    loading,
    error,
    refetch,
  };
}

// Export function to invalidate cache (useful after creating/updating treatments)
export function invalidateTreatmentHistoryCache(patientId?: string) {
  if (patientId) {
    treatmentHistoryCache.delete(patientId);
  } else {
    treatmentHistoryCache.clear();
  }
}
