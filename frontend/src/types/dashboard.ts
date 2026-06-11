export interface CycleAlert {
  patientTreatmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  treatmentName: string;
  nextDueDate: string;
  daysUntilDue: number;
  lastCycleReminderAt: string | null;
}

export interface DashboardAppointment {
  id: string;
  patient_id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  payment_status: 'unpaid' | 'paid' | 'partial' | 'refunded' | null;
  total_amount_cents: number | null;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface DashboardKpis {
  todayCount: number;
  confirmedCount: number;
  pendingCount: number;
  todayRevenueCents: number;
}

export interface DashboardDebtSummary {
  totalPendingCents: number;
  patientCount: number;
}

export interface DashboardData {
  todayAppointments: DashboardAppointment[];
  cycleAlerts: { upcoming: CycleAlert[]; overdue: CycleAlert[] };
  kpis: DashboardKpis;
  debtSummary: DashboardDebtSummary;
}
