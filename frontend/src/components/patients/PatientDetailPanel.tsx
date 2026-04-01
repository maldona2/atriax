import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePatient } from '@/hooks/usePatients';
import { useTreatments } from '@/hooks/useTreatments';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PatientFormDialog } from './PatientFormDialog';
import { MedicalHistoryDialog } from './MedicalHistoryDialog';
import {
  emptyForm,
  NewAppointmentSheet,
  TreatmentInfoSection,
} from '@/components/appointments';
import { paymentConfig } from '@/components/appointments/constants';
import type { PatientFormData } from '@/hooks/usePatients';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import type { PaymentStatus } from '@/types';
import {
  X,
  Pencil,
  Plus,
  Phone,
  Mail,
  Cake,
  FileText,
  Clock,
  User,
  Heart,
  Pill,
  AlertTriangle,
  Trash2,
  Banknote,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  pending: { label: 'Pendiente', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

interface PatientDetailPanelProps {
  patientId: string | null;
  onClose?: () => void;
}

export function PatientDetailPanel({
  patientId,
  onClose,
}: PatientDetailPanelProps) {
  const { detail, loading, refetch } = usePatient(patientId ?? undefined);
  const { treatments } = useTreatments();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [appointmentSheetOpen, setAppointmentSheetOpen] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(
    null
  );

  const handlePaymentChange = async (
    appointmentId: string,
    newStatus: PaymentStatus
  ) => {
    setUpdatingPaymentId(appointmentId);
    try {
      await api.put(`/appointments/${appointmentId}`, {
        payment_status: newStatus,
      });
      toast.success('Estado de pago actualizado');
      refetch();
    } catch {
      toast.error('Error al actualizar el estado de pago');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const [medicalDialogOpen, setMedicalDialogOpen] = useState(false);
  const [medicalDialogType, setMedicalDialogType] = useState<
    'condition' | 'medication' | 'allergy'
  >('condition');
  const [editingMedicalItem, setEditingMedicalItem] = useState<any>(null);

  const openMedicalDialog = (
    type: 'condition' | 'medication' | 'allergy',
    item?: any
  ) => {
    setMedicalDialogType(type);
    setEditingMedicalItem(item || null);
    setMedicalDialogOpen(true);
  };

  const openNewAppointment = () => {
    if (!patientId) return;
    setForm({ ...emptyForm, patient_id: patientId, date: new Date() });
    setAppointmentSheetOpen(true);
  };

  const handleMedicalSubmit = async (data: any) => {
    if (!patientId) return;
    const endpoints = {
      condition: 'conditions',
      medication: 'medications',
      allergy: 'allergies',
    };
    const endpoint = `/patients/${patientId}/${endpoints[medicalDialogType]}`;
    if (editingMedicalItem) {
      await api.put(`${endpoint}/${editingMedicalItem.id}`, data);
      toast.success('Actualizado correctamente');
    } else {
      await api.post(endpoint, data);
      toast.success('Agregado correctamente');
    }
    refetch();
  };

  const handleMedicalDelete = async (
    type: 'condition' | 'medication' | 'allergy',
    itemId: string
  ) => {
    if (!patientId || !confirm('¿Estás seguro de eliminar este registro?'))
      return;
    const endpoints = {
      condition: 'conditions',
      medication: 'medications',
      allergy: 'allergies',
    };
    await api.delete(`/patients/${patientId}/${endpoints[type]}/${itemId}`);
    toast.success('Eliminado correctamente');
    refetch();
  };

  const handleEditSubmit = async (data: PatientFormData) => {
    if (!patientId) return;
    const payload = {
      ...data,
      phone: data.phone || null,
      email: data.email || null,
      date_of_birth: data.date_of_birth || null,
      notes: data.notes || null,
    };
    await api.put(`/patients/${patientId}`, payload);
    toast.success('Paciente actualizado');
    setEditDialogOpen(false);
    refetch();
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.patient_id) {
      toast.error('Selecciona fecha y hora');
      return;
    }
    setSubmitting(true);
    try {
      const [hours, minutes] = form.time.split(':').map(Number);
      const scheduled = new Date(form.date);
      scheduled.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const { data: newApt } = await api.post<{ id: string }>('/appointments', {
        patient_id: form.patient_id,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: form.duration_minutes,
        notes: form.notes || null,
        payment_status: form.payment_status ?? 'unpaid',
        treatments:
          form.treatments && form.treatments.length > 0
            ? form.treatments
            : undefined,
      });

      if (form.session_procedures?.trim()) {
        await api.post('/sessions', {
          appointment_id: newApt.id,
          patient_id: form.patient_id,
          procedures_performed: form.session_procedures,
          recommendations: form.session_recommendations?.trim() || null,
        });
      }

      toast.success('Turno creado');
      setAppointmentSheetOpen(false);
      setForm(emptyForm);
      refetch();
    } catch {
      toast.error('Error al crear turno');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!patientId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">Selecciona un paciente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige un paciente de la lista para ver sus detalles
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b px-4 py-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <PanelSkeleton />
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No se pudo cargar el paciente
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const d = detail as any;
  const patient = d.patient ?? d;
  const appointments: any[] = d.appointments ?? [];
  const medical_history = d.medical_history ?? {
    conditions: [],
    medications: [],
    allergies: [],
  };

  const unpaidAppointments = appointments.filter(
    (a: any) => a.payment_status === 'unpaid'
  );
  const unpaidCount = unpaidAppointments.length;
  const unpaidTotalCents = unpaidAppointments.reduce(
    (sum: number, a: any) => sum + (a.total_amount_cents ?? 0),
    0
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b bg-muted/30 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(patient.first_name, patient.last_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground leading-tight">
                {patient.first_name} {patient.last_name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{patient.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={openNewAppointment}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva cita</span>
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="space-y-0 divide-y">
          {/* Contact info */}
          <div className="px-4 py-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Contacto
            </p>
            <div className="space-y-2">
              {patient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              {patient.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Cake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {new Date(patient.date_of_birth).toLocaleDateString(
                      'es-AR',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </span>
                </div>
              )}
              {!patient.phone && !patient.email && !patient.date_of_birth && (
                <p className="text-sm text-muted-foreground">
                  Sin información de contacto
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {patient.notes && (
            <div className="px-4 py-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notas
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {patient.notes}
              </p>
            </div>
          )}

          {/* Appointments */}
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Citas
                {appointments.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
                  >
                    {appointments.length}
                  </Badge>
                )}
              </p>
            </div>

            {unpaidCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-sm">
                  <Banknote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-800 dark:text-amber-300">
                    {unpaidCount} impago{unpaidCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums text-amber-900 dark:text-amber-200">
                  ${(unpaidTotalCents / 100).toFixed(2)}
                </span>
              </div>
            )}

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <CalendarDays className="mb-2 h-7 w-7 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Sin citas</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={openNewAppointment}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Crear primera cita
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((a: any) => {
                  const config = statusConfig[a.status] ?? {
                    label: a.status,
                    variant: 'secondary' as const,
                  };
                  const pmtCfg = a.payment_status
                    ? (paymentConfig[a.payment_status as PaymentStatus] ??
                      paymentConfig.unpaid)
                    : null;
                  return (
                    <Link
                      key={a.id}
                      to={`/app/appointments/${a.id}`}
                      className="group flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground">
                              {formatDate(a.scheduled_at)}
                            </p>
                            <Badge
                              variant={config.variant}
                              className="shrink-0 text-xs"
                            >
                              {config.label}
                            </Badge>
                            {pmtCfg &&
                              !(
                                a.treatments?.length > 0 &&
                                a.total_amount_cents > 0
                              ) && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'shrink-0 text-xs',
                                    pmtCfg.className
                                  )}
                                >
                                  {pmtCfg.label}
                                </Badge>
                              )}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between">
                            {a.procedures_performed && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {a.procedures_performed}
                              </p>
                            )}
                            {pmtCfg &&
                              !(
                                a.treatments?.length > 0 &&
                                a.total_amount_cents > 0
                              ) && (
                                <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
                                  $
                                  {((a.total_amount_cents ?? 0) / 100).toFixed(
                                    2
                                  )}
                                </span>
                              )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                      {a.treatments?.length > 0 &&
                        a.total_amount_cents > 0 &&
                        a.payment_status && (
                          <div onClick={(e) => e.preventDefault()}>
                            <TreatmentInfoSection
                              treatments={a.treatments}
                              totalAmountCents={a.total_amount_cents}
                              paymentStatus={a.payment_status}
                              onPaymentChange={(newStatus) =>
                                handlePaymentChange(a.id, newStatus)
                              }
                              isUpdating={updatingPaymentId === a.id}
                            />
                          </div>
                        )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Medical history */}
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Historial médico
            </p>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                  Condiciones
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => openMedicalDialog('condition')}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              </div>
              {medical_history.conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin condiciones</p>
              ) : (
                <div className="space-y-1">
                  {medical_history.conditions.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {c.condition_name}
                        </p>
                        {c.diagnosed_date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.diagnosed_date).toLocaleDateString(
                              'es-AR'
                            )}
                          </p>
                        )}
                        {c.notes && (
                          <p className="text-xs text-muted-foreground">
                            {c.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openMedicalDialog('condition', c)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMedicalDelete('condition', c.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Medications */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                  Medicamentos
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => openMedicalDialog('medication')}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              </div>
              {medical_history.medications.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin medicamentos
                </p>
              ) : (
                <div className="space-y-1">
                  {medical_history.medications.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {m.medication_name}
                        </p>
                        {m.dosage && (
                          <p className="text-xs text-muted-foreground">
                            Dosis: {m.dosage}
                          </p>
                        )}
                        {m.notes && (
                          <p className="text-xs text-muted-foreground">
                            {m.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openMedicalDialog('medication', m)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() =>
                            handleMedicalDelete('medication', m.id)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Allergies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                  Alergias
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-xs"
                  onClick={() => openMedicalDialog('allergy')}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              </div>
              {medical_history.allergies.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin alergias</p>
              ) : (
                <div className="space-y-1">
                  {medical_history.allergies.map((al: any) => (
                    <div
                      key={al.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">
                            {al.allergen_name}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {al.allergy_type === 'medication' && 'Medicamento'}
                            {al.allergy_type === 'food' && 'Alimento'}
                            {al.allergy_type === 'other' && 'Otro'}
                          </Badge>
                        </div>
                        {al.notes && (
                          <p className="text-xs text-muted-foreground">
                            {al.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openMedicalDialog('allergy', al)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleMedicalDelete('allergy', al.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Dialogs & Sheets */}
      <PatientFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        patient={patient}
        onSubmit={handleEditSubmit}
      />

      <MedicalHistoryDialog
        open={medicalDialogOpen}
        onOpenChange={setMedicalDialogOpen}
        type={medicalDialogType}
        item={editingMedicalItem}
        onSubmit={handleMedicalSubmit}
      />

      <Sheet open={appointmentSheetOpen} onOpenChange={setAppointmentSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
          <NewAppointmentSheet
            form={form}
            setForm={setForm}
            patients={[patient]}
            treatments={treatments}
            submitting={submitting}
            onSubmit={handleAppointmentSubmit}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
