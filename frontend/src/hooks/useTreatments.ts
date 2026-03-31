import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Treatment, PatientTreatment } from '@/types';

interface CreateTreatmentInput {
  name: string;
  price_cents: number;
  initial_frequency_weeks?: number | null;
  initial_sessions_count?: number | null;
  maintenance_frequency_weeks?: number | null;
  protocol_notes?: string | null;
}

interface UpdateTreatmentInput extends Partial<CreateTreatmentInput> {}

export function useTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTreatments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Treatment[]>('/treatments');
      setTreatments(data);
    } catch {
      setTreatments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const create = useCallback(async (input: CreateTreatmentInput) => {
    try {
      const { data } = await api.post<Treatment>('/treatments', input);
      setTreatments((prev) => [...prev, data]);
      toast.success('Tratamiento creado');
      return data;
    } catch (err: unknown) {
      const res =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const msg =
        res && typeof res === 'object' && res !== null && 'error' in res
          ? (res as { error?: { message?: string } }).error?.message
          : 'Error al crear tratamiento';
      toast.error(msg);
      throw err;
    }
  }, []);

  const update = useCallback(
    async (id: string, input: UpdateTreatmentInput) => {
      try {
        const { data } = await api.put<Treatment>(`/treatments/${id}`, input);
        setTreatments((prev) => prev.map((t) => (t.id === id ? data : t)));
        toast.success('Tratamiento actualizado');
        return data;
      } catch (err: unknown) {
        const res =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: unknown } }).response?.data;
        const msg =
          res && typeof res === 'object' && res !== null && 'error' in res
            ? (res as { error?: { message?: string } }).error?.message
            : 'Error al actualizar tratamiento';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/treatments/${id}`);
      setTreatments((prev) => prev.filter((t) => t.id !== id));
      toast.success('Tratamiento eliminado');
    } catch (err: unknown) {
      const res =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const msg =
        res && typeof res === 'object' && res !== null && 'error' in res
          ? (res as { error?: { message?: string } }).error?.message
          : 'Error al eliminar tratamiento';
      toast.error(msg);
      throw err;
    }
  }, []);

  return {
    treatments,
    loading,
    refetch: fetchTreatments,
    create,
    update,
    remove,
  };
}

export function usePatientTreatments(patientId: string | null) {
  const [patientTreatments, setPatientTreatments] = useState<
    PatientTreatment[]
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchPatientTreatments = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const { data } = await api.get<PatientTreatment[]>(
        `/patient-treatments/patient/${patientId}`
      );
      setPatientTreatments(data);
    } catch {
      setPatientTreatments([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientTreatments();
  }, [fetchPatientTreatments]);

  const assignTreatment = useCallback(
    async (treatmentId: string) => {
      if (!patientId) return null;
      try {
        const { data } = await api.post<PatientTreatment>(
          '/patient-treatments',
          {
            patient_id: patientId,
            treatment_id: treatmentId,
          }
        );
        setPatientTreatments((prev) => [...prev, data]);
        toast.success('Tratamiento asignado al paciente');
        return data;
      } catch (err: unknown) {
        const res =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: unknown } }).response?.data;
        const msg =
          res && typeof res === 'object' && res !== null && 'error' in res
            ? (res as { error?: { message?: string } }).error?.message
            : 'Error al asignar tratamiento';
        toast.error(msg);
        throw err;
      }
    },
    [patientId]
  );

  const completeSession = useCallback(
    async (id: string, appointmentId: string | null) => {
      try {
        const { data } = await api.post<PatientTreatment>(
          `/patient-treatments/${id}/complete-session`,
          {
            appointment_id: appointmentId,
          }
        );
        setPatientTreatments((prev) =>
          prev.map((pt) => (pt.id === id ? data : pt))
        );
        toast.success('Sesión completada');
        return data;
      } catch (err: unknown) {
        const res =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: unknown } }).response?.data;
        const msg =
          res && typeof res === 'object' && res !== null && 'error' in res
            ? (res as { error?: { message?: string } }).error?.message
            : 'Error al completar sesión';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  const reactivatePatientTreatment = useCallback(async (id: string) => {
    try {
      const { data } = await api.put<PatientTreatment>(
        `/patient-treatments/${id}`,
        { is_active: true }
      );
      setPatientTreatments((prev) =>
        prev.map((pt) => (pt.id === id ? data : pt))
      );
      toast.success('Tratamiento reactivado');
    } catch (err: unknown) {
      const res =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const msg =
        res && typeof res === 'object' && res !== null && 'error' in res
          ? (res as { error?: { message?: string } }).error?.message
          : 'Error al reactivar tratamiento';
      toast.error(msg);
      throw err;
    }
  }, []);

  const removePatientTreatment = useCallback(async (id: string) => {
    try {
      await api.delete(`/patient-treatments/${id}`);
      setPatientTreatments((prev) => prev.filter((pt) => pt.id !== id));
      toast.success('Tratamiento eliminado del paciente');
    } catch (err: unknown) {
      const res =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: unknown } }).response?.data;
      const msg =
        res && typeof res === 'object' && res !== null && 'error' in res
          ? (res as { error?: { message?: string } }).error?.message
          : 'Error al eliminar tratamiento del paciente';
      toast.error(msg);
      throw err;
    }
  }, []);

  const calculateNextAppointment = useCallback(
    (patientTreatment: PatientTreatment): Date | null => {
      const treatment = patientTreatment.treatment;
      if (!treatment) return null;

      const hasInitialPhase =
        treatment.initial_frequency_weeks !== null &&
        treatment.initial_sessions_count !== null &&
        treatment.initial_sessions_count > 0;

      const hasMaintenancePhase =
        treatment.maintenance_frequency_weeks !== null;

      if (!hasInitialPhase && !hasMaintenancePhase) return null;

      const currentSession = patientTreatment.current_session;
      const initialSessionsCount = treatment.initial_sessions_count ?? 0;

      const inInitialPhase =
        hasInitialPhase && currentSession <= initialSessionsCount;

      let weeksToAdd: number | null = null;

      if (inInitialPhase && treatment.initial_frequency_weeks !== null) {
        weeksToAdd = treatment.initial_frequency_weeks;
      } else if (
        !inInitialPhase &&
        hasMaintenancePhase &&
        treatment.maintenance_frequency_weeks !== null
      ) {
        weeksToAdd = treatment.maintenance_frequency_weeks;
      }

      if (weeksToAdd === null) return null;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + weeksToAdd * 7);
      return nextDate;
    },
    []
  );

  return {
    patientTreatments,
    loading,
    refetch: fetchPatientTreatments,
    assignTreatment,
    completeSession,
    reactivatePatientTreatment,
    removePatientTreatment,
    calculateNextAppointment,
  };
}
