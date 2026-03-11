export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'super_admin' | 'professional';
  tenantId: string | null;
  phone?: string | null;
  specialty?: string | null;
  licenseNumber?: string | null;
  address?: string | null;
  bio?: string | null;
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }> | null;
  workingHours?: { start: string; end: string; days: string[] } | null;
  appointmentDuration?: number | null;
  avatarUrl?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  user_email?: string;
}

export interface Patient {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  duration_minutes: number;
  notes: string | null;
  patient_id: string;
  tenant_id: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

export interface AppointmentWithSession {
  id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  procedures_performed?: string | null;
  recommendations?: string | null;
}

export interface PatientDetail {
  patient: Patient;
  appointments: AppointmentWithSession[];
}

export interface AppointmentDetail extends Appointment {
  procedures_performed?: string | null;
  recommendations?: string | null;
}

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export interface DataTableFilterField<TData> {
  label: string;
  value: keyof TData | string;
  placeholder?: string;
  options?: Option[];
}
