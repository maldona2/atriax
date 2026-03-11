import type { AppointmentFormData } from '@/hooks/useAppointments';

export const statusConfig: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  pending: {
    label: 'Pendiente',
    className:
      'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/80',
    dotColor: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmado',
    className:
      'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/80 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-sky-900/80',
    dotColor: 'bg-sky-500',
  },
  completed: {
    label: 'Completado',
    className:
      'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/80',
    dotColor: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelado',
    className:
      'bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-900/80 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/80 line-through opacity-60',
    dotColor: 'bg-neutral-400',
  },
};

export const HOUR_HEIGHT = 60;
export const START_HOUR = 0;
export const END_HOUR = 24;
export const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);

export const emptyForm: AppointmentFormData = {
  patient_id: '',
  date: null,
  time: '10:00',
  duration_minutes: 60,
  notes: '',
};
