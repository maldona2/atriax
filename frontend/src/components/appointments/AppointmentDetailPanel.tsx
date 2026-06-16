import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, CalendarDays, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppointmentDetail } from '@/hooks/useAppointments';
import { PatientInfoSection } from './PatientInfoSection';
import { SessionDocumentationForm } from './SessionDocumentationForm';
import { PhotoUploadComponent } from './PhotoUploadComponent';
import { TreatmentInfoSection } from './TreatmentInfoSection';
import { MedicalHistorySection } from './MedicalHistorySection';
import { NextAppointmentSection } from './NextAppointmentSection';
import { PaymentHistorySection } from './PaymentHistorySection';
import { AppointmentInfoSection } from './AppointmentInfoSection';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import api from '@/lib/api';
import type { Appointment, PaymentStatus } from '@/types';
import type { AppointmentEditFormData } from './AppointmentInfoSection';

interface AppointmentDetailPanelProps {
  appointmentId: string | null;
  onClose?: () => void;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function buildScheduledAt(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

function getApiErrorMessage(
  error: unknown,
  operation: 'editar' | 'eliminar'
): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string; error?: { message?: string } };
      };
    };
    const status = axiosError.response?.status;
    if (status === 404) return 'Turno no encontrado';
    if (status === 403)
      return `No tienes permisos para ${operation} este turno`;
    if (status === 400) {
      const data = axiosError.response?.data;
      const msg = data?.error?.message ?? data?.message;
      if (msg) return msg;
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: string }).message;
    if (msg?.includes('Network Error') || msg?.includes('network')) {
      return 'Error de conexión. Verifica tu conexión a internet';
    }
  }
  return 'Error de conexión. Verifica tu conexión a internet';
}

type ValidationErrors = Record<string, string>;

const VALID_STATUSES: Appointment['status'][] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no-show',
];

function validateAppointmentForm(
  formData: AppointmentEditFormData
): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!formData.scheduled_date) {
    errors.scheduled_date = 'La fecha es requerida';
  }
  if (
    !formData.scheduled_time ||
    !/^\d{2}:\d{2}$/.test(formData.scheduled_time)
  ) {
    errors.scheduled_time = 'La hora es requerida';
  }
  if (
    !Number.isFinite(formData.duration_minutes) ||
    formData.duration_minutes < 1 ||
    formData.duration_minutes > 1440
  ) {
    errors.duration_minutes = 'La duración debe estar entre 1 y 1440 minutos';
  }
  if (!VALID_STATUSES.includes(formData.status)) {
    errors.status = 'Estado inválido';
  }
  return errors;
}

function initFormData(detail: {
  scheduled_at: string;
  duration_minutes: number | null;
  notes: string | null;
  status: Appointment['status'];
}): AppointmentEditFormData {
  const parsed = parseISO(detail.scheduled_at);
  return {
    scheduled_date: parsed,
    scheduled_time: format(parsed, 'HH:mm'),
    duration_minutes: detail.duration_minutes ?? 60,
    notes: detail.notes ?? '',
    status: detail.status,
  };
}

export function AppointmentDetailPanel({
  appointmentId,
  onClose,
}: AppointmentDetailPanelProps) {
  const { detail, loading, refetch } = useAppointmentDetail(appointmentId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<
    Appointment['status'] | null
  >(null);
  const [activePayment, setActivePayment] = useState<PaymentStatus | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<AppointmentEditFormData>({
    scheduled_date: null,
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',
    status: 'pending',
  });
  const [originalData, setOriginalData] =
    useState<AppointmentEditFormData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setActiveSessionId(null);
    setIsEditMode(false);
    setValidationErrors({});
  }, [appointmentId]);

  useEffect(() => {
    if (detail) {
      setActivePayment(detail.payment_status ?? null);
      setActiveStatus(detail.status);
    }
  }, [detail]);

  const sessionId = activeSessionId ?? detail?.session_id ?? null;
  const currentStatus = activeStatus ?? detail?.status ?? 'pending';

  const canEdit = useCallback(() => {
    if (!detail) return false;
    return !detail.session_id;
  }, [detail]);

  const handleEditClick = useCallback(() => {
    if (!detail) return;
    const initial = initFormData(detail);
    setFormData(initial);
    setOriginalData(initial);
    setValidationErrors({});
    setIsEditMode(true);
  }, [detail]);

  const handleCancelClick = useCallback(() => {
    if (originalData) {
      setFormData(originalData);
    }
    setValidationErrors({});
    setIsEditMode(false);
  }, [originalData]);

  const handleFieldChange = useCallback(
    (
      field: keyof AppointmentEditFormData,
      value: AppointmentEditFormData[keyof AppointmentEditFormData]
    ) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };
        const errors = validateAppointmentForm(next);
        setValidationErrors(errors);
        return next;
      });
    },
    []
  );

  const handleSaveClick = useCallback(async () => {
    if (!detail) return;
    const errors = validateAppointmentForm(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setIsSaving(true);
    try {
      const scheduledAt = buildScheduledAt(
        formData.scheduled_date!,
        formData.scheduled_time
      );
      await api.put(`/appointments/${detail.id}`, {
        scheduled_at: scheduledAt,
        duration_minutes: formData.duration_minutes,
        notes: formData.notes || null,
        status: formData.status,
      });
      setIsEditMode(false);
      setActiveStatus(formData.status);
      refetch();
      toast.success('Turno actualizado');
    } catch (error) {
      const msg = getApiErrorMessage(error, 'editar');
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }, [detail, formData, refetch]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!detail) return;
    setIsDeleting(true);
    try {
      await api.delete(`/appointments/${detail.id}`);
      setShowDeleteDialog(false);
      toast.success('Turno eliminado');
      onClose?.();
    } catch (error) {
      setShowDeleteDialog(false);
      const msg = getApiErrorMessage(error, 'eliminar');
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [detail, onClose]);

  const handleCloseAttempt = useCallback(() => {
    if (isSaving || isDeleting) return;
    if (isEditMode) {
      const confirmed = window.confirm(
        '¿Descartar los cambios no guardados y cerrar?'
      );
      if (!confirmed) return;
      setIsEditMode(false);
      setValidationErrors({});
    }
    onClose?.();
  }, [isEditMode, isSaving, isDeleting, onClose]);

  const handlePaymentChange = async (newStatus: PaymentStatus) => {
    if (!detail) return;
    setIsUpdating(true);
    try {
      await api.put(`/appointments/${detail.id}`, {
        payment_status: newStatus,
      });
      setActivePayment(newStatus ?? null);
      refetch();
      toast.success('Estado de pago actualizado');
    } catch {
      toast.error('No se pudo actualizar el pago');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!appointmentId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <CalendarDays className="mb-3 h-12 w-12 opacity-30" />
        <p className="font-medium">Selecciona un turno</p>
        <p className="mt-1 text-sm">
          Elige un turno de la lista para ver sus detalles.
        </p>
      </div>
    );
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-6">
        <p className="font-medium">No se pudo cargar el turno</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
          Reintentar
        </Button>
      </div>
    );
  }

  const scheduledDate = parseISO(detail.scheduled_at);
  const isFormValid =
    Object.keys(validateAppointmentForm(formData)).length === 0;

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="shrink-0 border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground capitalize">
                {format(scheduledDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <h2 className="text-xl font-semibold tabular-nums">
                {format(scheduledDate, 'HH:mm')}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {detail.patient_last_name && detail.patient_first_name
                  ? `${detail.patient_last_name}, ${detail.patient_first_name}`
                  : detail.patient_first_name ||
                    detail.patient_last_name ||
                    'Sin nombre'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditMode && canEdit() && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar turno"
                    onClick={handleEditClick}
                    disabled={isSaving || isDeleting}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar turno"
                    onClick={handleDeleteClick}
                    disabled={isSaving || isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isEditMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelClick}
                    disabled={isSaving}
                    aria-label="Cancelar edición"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveClick}
                    disabled={isSaving || !isFormValid}
                    aria-label="Guardar cambios del turno"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Guardar
                  </Button>
                </>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar panel"
                  onClick={handleCloseAttempt}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isEditMode && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Cambios no guardados
            </p>
          )}
          {!isEditMode && !canEdit() && (
            <p className="mt-2 text-xs text-muted-foreground">
              No se puede editar: el turno tiene documentación de sesión.
            </p>
          )}
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Appointment info (edit/view) */}
            <AppointmentInfoSection
              appointment={detail}
              isEditMode={isEditMode}
              formData={formData}
              validationErrors={validationErrors}
              disabled={isSaving}
              onChange={handleFieldChange}
            />

            <Separator />

            {/* Patient info */}
            <PatientInfoSection appointment={detail} />

            <Separator />

            {/* Next appointment recommendation */}
            <NextAppointmentSection patientId={detail.patient_id} />

            <Separator />

            {/* Session documentation */}
            <SessionDocumentationForm
              appointmentId={detail.id}
              patientId={detail.patient_id}
              sessionId={sessionId}
              initialProcedures={detail.procedures_performed ?? ''}
              initialRecommendations={detail.recommendations ?? ''}
              onSessionCreated={(id) => {
                setActiveSessionId(id);
                refetch();
              }}
              onStatusChange={(status) => {
                setActiveStatus(status);
                refetch();
              }}
              currentStatus={currentStatus}
            />

            <Separator />

            {/* Photo upload */}
            <PhotoUploadComponent
              sessionId={sessionId}
              appointmentId={detail.id}
              patientId={detail.patient_id}
              onSessionCreated={(id) => {
                setActiveSessionId(id);
                refetch();
              }}
            />

            {/* Treatments */}
            {detail.treatments &&
              detail.treatments.length > 0 &&
              activePayment !== null && (
                <>
                  <Separator />
                  <TreatmentInfoSection
                    treatments={detail.treatments}
                    totalAmountCents={detail.total_amount_cents}
                    paymentStatus={activePayment}
                    onPaymentChange={handlePaymentChange}
                    isUpdating={isUpdating}
                  />
                </>
              )}

            <Separator />

            {/* Payment history */}
            <PaymentHistorySection patientId={detail.patient_id} />

            <Separator />

            {/* Medical history */}
            <MedicalHistorySection
              patientId={detail.patient_id}
              excludeSessionId={sessionId}
            />
          </div>
        </ScrollArea>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onClose={() => !isDeleting && setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        appointmentInfo={format(
          scheduledDate,
          "d 'de' MMMM 'de' yyyy 'a las' HH:mm",
          {
            locale: es,
          }
        )}
      />
    </>
  );
}
