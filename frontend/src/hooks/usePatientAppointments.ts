import { useState, useEffect, useCallback } from 'react';
import { fetchPatientAppointments } from '@/lib/debtDashboardApi';
import type { PatientAppointmentDetail } from '@/types/debtDashboard';

export function usePatientAppointments(
  patientId: string | null,
  startDate?: string,
  endDate?: string
) {
  const [data, setData] = useState<PatientAppointmentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!patientId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchPatientAppointments(patientId, startDate, endDate)
      .then((result) => setData(result))
      .catch(() => setError('No se pudieron cargar los turnos'))
      .finally(() => setLoading(false));
  }, [patientId, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
