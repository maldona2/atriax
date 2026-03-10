import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Appointment, AppointmentDetail } from '@/types';

export interface AppointmentFormData {
  patient_id: string;
  date: Date | null;
  time: string;
  duration_minutes: number;
  notes: string;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<Appointment['status'] | 'all'>('all');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (date) {
        params.date = date.toISOString().slice(0, 10);
      }
      if (status !== 'all') {
        params.status = status;
      }
      const { data } = await api.get<Appointment[]>('/appointments', {
        params,
      });
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  }, [date, status]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    date,
    setDate,
    status,
    setStatus,
    refetch: fetchAppointments,
  };
}

export function useAppointment(id: string | undefined) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<AppointmentDetail>(`/appointments/${id}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  return { detail, loading };
}
