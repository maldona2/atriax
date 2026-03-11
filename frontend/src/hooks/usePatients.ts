import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Patient, PatientDetail } from '@/types';

export interface PatientFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  notes: string;
}

export function usePatients(initialQuery = '') {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = query ? { q: query } : {};
      const { data } = await api.get<Patient[]>('/patients', { params });
      setPatients(data);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { patients, loading, query, setQuery, refetch: fetchPatients };
}

export function usePatient(id: string | undefined) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get<PatientDetail>(`/patients/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<PatientDetail>(`/patients/${id}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  return { detail, loading, refetch };
}
