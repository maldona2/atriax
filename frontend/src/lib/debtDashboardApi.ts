import api from './api';
import type {
  PaymentStatistics,
  AgingReport,
  PaymentPlan,
  PatientAppointmentDetail,
  PatientPaymentRecord,
  PaymentMethodAnalytics,
  PaymentHistoryFilters,
  CreatePaymentPlanInput,
  UpdatePaymentPlanInput,
  RecordPaymentInput,
  UpdateAppointmentPaymentInput,
} from '../types/debtDashboard';

export async function fetchStatistics(
  startDate?: string,
  endDate?: string
): Promise<PaymentStatistics> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const { data } = await api.get('/debt-dashboard/statistics', { params });
  return data;
}

export async function fetchAgingReport(): Promise<AgingReport> {
  const { data } = await api.get('/debt-dashboard/aging-report');
  return data;
}

export async function fetchPaymentPlans(
  status?: string
): Promise<PaymentPlan[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  const { data } = await api.get('/debt-dashboard/payment-plans', { params });
  return data.plans;
}

export async function fetchPaymentHistory(
  filters: PaymentHistoryFilters = {}
): Promise<{ records: PatientPaymentRecord[]; totalCount: number }> {
  const params: Record<string, string | number> = {};
  if (filters.patientId) params.patientId = filters.patientId;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
  if (filters.minAmount !== undefined) params.minAmount = filters.minAmount;
  if (filters.maxAmount !== undefined) params.maxAmount = filters.maxAmount;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  const { data } = await api.get('/debt-dashboard/payment-history', { params });
  return data;
}

export async function fetchPaymentMethodAnalytics(): Promise<
  PaymentMethodAnalytics[]
> {
  const { data } = await api.get('/debt-dashboard/payment-methods');
  return data.methods;
}

export async function fetchPatientAppointments(
  patientId: string
): Promise<PatientAppointmentDetail[]> {
  const { data } = await api.get('/debt-dashboard/patient-appointments', {
    params: { patientId },
  });
  return data.appointments;
}

export async function createPaymentPlan(
  input: CreatePaymentPlanInput
): Promise<PaymentPlan> {
  const { data } = await api.post('/debt-dashboard/payment-plans', input);
  return data;
}

export async function updatePaymentPlan(
  id: string,
  input: UpdatePaymentPlanInput
): Promise<PaymentPlan> {
  const { data } = await api.patch(
    `/debt-dashboard/payment-plans/${id}`,
    input
  );
  return data;
}

export async function cancelPaymentPlan(id: string): Promise<void> {
  await api.delete(`/debt-dashboard/payment-plans/${id}`);
}

export async function recordPayment(
  id: string,
  input: RecordPaymentInput
): Promise<PaymentPlan> {
  const { data } = await api.post(
    `/debt-dashboard/payment-plans/${id}/payments`,
    input
  );
  return data;
}

export async function markPlanDelinquent(id: string): Promise<PaymentPlan> {
  const { data } = await api.post(
    `/debt-dashboard/payment-plans/${id}/mark-delinquent`
  );
  return data;
}

export async function reactivatePlan(id: string): Promise<PaymentPlan> {
  const { data } = await api.post(
    `/debt-dashboard/payment-plans/${id}/reactivate`
  );
  return data;
}

export async function updateAppointmentPayment(
  appointmentId: string,
  input: UpdateAppointmentPaymentInput
): Promise<PatientAppointmentDetail> {
  const { data } = await api.patch(
    `/debt-dashboard/appointments/${appointmentId}/payment`,
    input
  );
  return data.appointment;
}
