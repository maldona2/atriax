export interface PaymentStatistics {
  totalPaidCents: number;
  totalUnpaidCents: number;
  collectionRate: number;
  patientsWithBalance: number;
  averageDebtCents: number;
  lastUpdated: string;
}

export interface AgingBucket {
  range: string;
  minDays: number;
  maxDays: number | null;
  totalAmountCents: number;
  patientCount: number;
  percentage: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  lastUpdated: string;
}

export interface PaymentPlan {
  id: string;
  patientId: string;
  patientName: string;
  totalAmountCents: number;
  installmentAmountCents: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  nextPaymentDate: string | null;
  status: 'active' | 'completed' | 'delinquent' | 'cancelled';
  onTimePayments: number;
  latePayments: number;
  completionPercentage: number;
}

export interface PatientPaymentRecord {
  patientId: string;
  patientName: string;
  totalDebtCents: number;
  paidCents: number;
  unpaidCents: number;
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';
  lastPaymentDate: string | null;
}

export interface PaymentMethodAnalytics {
  paymentMethod: string;
  totalAmountCents: number;
  transactionCount: number;
  averageAmountCents: number;
  percentage: number;
}

export interface PatientAppointmentDetail {
  id: string;
  scheduledAt: string;
  status: string;
  paymentStatus: string;
  totalAmountCents: number | null;
  notes: string | null;
}

export interface PaymentHistoryFilters {
  patientId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePaymentPlanInput {
  patientId: string;
  totalAmountCents: number;
  installmentAmountCents: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
}

export interface UpdatePaymentPlanInput {
  installmentAmountCents?: number;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  nextPaymentDate?: string | null;
}

export interface RecordPaymentInput {
  paymentDate: string;
  paymentStatus: 'on_time' | 'late';
}
