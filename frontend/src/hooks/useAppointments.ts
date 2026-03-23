import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type {
  Appointment,
  AppointmentDetail,
  AppointmentDetailExtended,
  TreatmentLineItem,
} from '@/types';

export interface AppointmentFormData {
  patient_id: string;
  date: Date | null;
  time: string;
  duration_minutes: number;
  notes: string;
  payment_status?: 'unpaid' | 'paid' | 'partial' | 'refunded';
  treatments?: TreatmentLineItem[];
}

export interface AppointmentListFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  status?: Appointment['status'] | 'all';
}

export function useAppointments(filters?: AppointmentListFilters) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<Appointment['status'] | 'all'>('all');

  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;
  const filterStatus = filters?.status ?? status;

  const fetchAppointments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (dateFrom) {
          params.date_from = dateFrom.toISOString().slice(0, 10);
        } else if (date) {
          params.date = date.toISOString().slice(0, 10);
        }
        if (dateTo) {
          params.date_to = dateTo.toISOString().slice(0, 10);
        }
        if (filterStatus !== 'all') {
          params.status = filterStatus;
        }
        const { data } = await api.get<Appointment[]>('/appointments', {
          params,
        });
        setAppointments(data);
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [date, filterStatus, dateFrom, dateTo]
  );

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

  const fetch = useCallback(() => {
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

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { detail, loading, refetch: fetch };
}

export function useAppointmentDetail(id: string | undefined) {
  const [detail, setDetail] = useState<AppointmentDetailExtended | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(() => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<AppointmentDetailExtended>(`/appointments/${id}/detail`)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, refetch: fetchDetail };
}
