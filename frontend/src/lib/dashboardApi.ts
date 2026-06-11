import api from './api';
import type { DashboardData } from '../types/dashboard';

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get('/dashboard');
  return data;
}

export async function sendCycleReminder(
  patientTreatmentId: string
): Promise<{ status: string }> {
  const { data } = await api.post(
    `/dashboard/cycle-reminder/${patientTreatmentId}`
  );
  return data;
}
