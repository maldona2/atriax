import { useState, useEffect } from 'react';
import { addWeeks } from 'date-fns';
import api from '@/lib/api';
import type { PatientTreatment } from '@/types';

export interface CalculationDetails {
  treatmentName: string;
  phase: 'initial' | 'maintenance';
  frequencyWeeks: number;
}

interface SuggestedAppointmentDateResult {
  suggestedDate: Date | null;
  loading: boolean;
  error: string | null;
  calculationDetails: CalculationDetails | null;
}

function getPhaseAndFrequency(
  pt: PatientTreatment
): { phase: 'initial' | 'maintenance'; frequencyWeeks: number } | null {
  const treatment = pt.treatment;
  if (!treatment) return null;

  // Mirrors backend patientTreatmentService.calculateNextAppointment logic:
  // initial phase is "complete" only when initial_sessions_count is defined
  // AND current_session has reached or exceeded it.
  const initialPhaseComplete =
    treatment.initial_sessions_count !== null &&
    pt.current_session >= treatment.initial_sessions_count;

  if (!initialPhaseComplete && treatment.initial_frequency_weeks !== null) {
    return {
      phase: 'initial',
      frequencyWeeks: treatment.initial_frequency_weeks,
    };
  }

  if (initialPhaseComplete && treatment.maintenance_frequency_weeks !== null) {
    return {
      phase: 'maintenance',
      frequencyWeeks: treatment.maintenance_frequency_weeks,
    };
  }

  return null;
}

async function getLastAppointmentDate(
  appointmentId: string,
  signal: AbortSignal
): Promise<Date | null> {
  try {
    const { data } = await api.get<{ scheduled_at: string }>(
      `/appointments/${appointmentId}`,
      { signal }
    );
    return new Date(data.scheduled_at);
  } catch {
    return null;
  }
}

async function calculateForTreatment(
  pt: PatientTreatment,
  signal: AbortSignal
): Promise<{ date: Date; details: CalculationDetails } | null> {
  const phaseInfo = getPhaseAndFrequency(pt);
  if (!phaseInfo) return null;

  const { phase, frequencyWeeks } = phaseInfo;

  let baseDate: Date;
  if (pt.last_appointment_id) {
    const lastDate = await getLastAppointmentDate(
      pt.last_appointment_id,
      signal
    );
    baseDate = lastDate ?? new Date();
  } else {
    baseDate = new Date();
  }

  const calculated = addWeeks(baseDate, frequencyWeeks);
  const now = new Date();
  const suggestedDate = calculated < now ? now : calculated;

  return {
    date: suggestedDate,
    details: {
      treatmentName: pt.treatment?.name ?? '',
      phase,
      frequencyWeeks,
    },
  };
}

export function useSuggestedAppointmentDate(
  patientId: string | null,
  options?: { enabled?: boolean }
): SuggestedAppointmentDateResult {
  const enabled = options?.enabled ?? true;
  const [suggestedDate, setSuggestedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculationDetails, setCalculationDetails] =
    useState<CalculationDetails | null>(null);

  useEffect(() => {
    if (!patientId || !enabled) {
      setSuggestedDate(null);
      setCalculationDetails(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    async function calculate() {
      setLoading(true);
      setError(null);
      try {
        const { data: treatments } = await api.get<PatientTreatment[]>(
          `/patient-treatments/patient/${patientId}`,
          { signal }
        );

        const active = treatments.filter(
          (pt) => pt.is_active && getPhaseAndFrequency(pt) !== null
        );

        if (active.length === 0) {
          setSuggestedDate(null);
          setCalculationDetails(null);
          return;
        }

        const results = await Promise.all(
          active.map((pt) => calculateForTreatment(pt, signal))
        );

        const valid = results.filter(
          (r): r is { date: Date; details: CalculationDetails } => r !== null
        );

        if (valid.length === 0) {
          setSuggestedDate(null);
          setCalculationDetails(null);
          return;
        }

        const earliest = valid.reduce((min, r) =>
          r.date < min.date ? r : min
        );
        setSuggestedDate(earliest.date);
        setCalculationDetails(earliest.details);
      } catch (err) {
        const name = (err as { name?: string }).name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        console.error('Error al calcular fecha sugerida:', err);
        setError('Error al calcular fecha sugerida');
        setSuggestedDate(null);
        setCalculationDetails(null);
      } finally {
        setLoading(false);
      }
    }

    calculate();

    return () => {
      controller.abort();
    };
  }, [patientId, enabled]);

  return { suggestedDate, loading, error, calculationDetails };
}
