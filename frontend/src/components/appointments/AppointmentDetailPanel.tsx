import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, CalendarDays } from 'lucide-react';
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
import type { Appointment } from '@/types';

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

export function AppointmentDetailPanel({
  appointmentId,
  onClose,
}: AppointmentDetailPanelProps) {
  const { detail, loading, refetch } = useAppointmentDetail(appointmentId);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<
    Appointment['status'] | null
  >(null);

  // Use the detail's session id if it exists, fallback to locally-created one
  const sessionId = activeSessionId ?? detail?.session_id ?? null;
  const currentStatus = activeStatus ?? detail?.status ?? 'pending';

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

  return (
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
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Patient info */}
          <PatientInfoSection appointment={detail} />

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
          <PhotoUploadComponent sessionId={sessionId} />

          {/* Treatments */}
          {detail.treatments && detail.treatments.length > 0 && (
            <>
              <Separator />
              <TreatmentInfoSection
                treatments={detail.treatments}
                totalAmountCents={detail.total_amount_cents}
                paymentStatus={detail.payment_status}
              />
            </>
          )}

          <Separator />

          {/* Medical history */}
          <MedicalHistorySection
            patientId={detail.patient_id}
            excludeSessionId={sessionId}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
