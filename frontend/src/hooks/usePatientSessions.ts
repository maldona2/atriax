import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { PreviousSession } from '@/types';

export function usePatientSessions(
  patientId: string | undefined,
  excludeSessionId?: string | null
) {
  const [sessions, setSessions] = useState<PreviousSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(() => {
    if (!patientId) {
      setSessions([]);
      return;
    }
    setLoading(true);
    const params: Record<string, string> = {};
    if (excludeSessionId) {
      params.exclude_session_id = excludeSessionId;
    }
    api
      .get<PreviousSession[]>(`/patients/${patientId}/sessions`, { params })
      .then(({ data }) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [patientId, excludeSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, refetch: fetchSessions };
}
