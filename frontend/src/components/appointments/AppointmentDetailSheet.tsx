import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon,
  Clock,
  User,
  FileText,
  DollarSign,
  Banknote,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import { statusConfig, paymentConfig } from './constants';
import { CalendarSyncStatus } from './CalendarSyncStatus';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import type {
  Appointment,
  AppointmentDetail,
  AppointmentTreatment,
  PaymentStatus,
} from '@/types';

interface AppointmentDetailSheetProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: (updated: Appointment) => void;
  onDelete?: (appointmentId: string) => void;
}

export function AppointmentDetailSheet({
  appointment,
  onClose,
  onStatusChange,
  onDelete,
}: AppointmentDetailSheetProps) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [activeStatus, setActiveStatus] = useState(appointment.status);
  const [activePayment, setActivePayment] = useState<PaymentStatus>(
    appointment.payment_status ?? 'unpaid'
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    api
      .get<AppointmentDetail>(`/appointments/${appointment.id}`)
      .then(({ data }) => {
        setDetail(data);
        setActiveStatus(data.status);
        setActivePayment((data.payment_status as PaymentStatus) ?? 'unpaid');
      })
      .catch(() => setDetail(null));
  }, [appointment.id]);

  const display = detail ?? appointment;
  const config = statusConfig[activeStatus];
  const patient =
    display.patient_last_name && display.patient_first_name
      ? `${display.patient_last_name}, ${display.patient_first_name}`
      : display.patient_first_name || display.patient_last_name || 'Sin nombre';
  const scheduledDate = parseISO(display.scheduled_at);
  const totalCents = display.total_amount_cents ?? 0;
  const treatmentsList: AppointmentTreatment[] =
    detail && Array.isArray(detail.treatments) ? detail.treatments : [];

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data } = await api.put<Appointment>(
        `/appointments/${appointment.id}`,
        { status: newStatus }
      );
      setActiveStatus(data.status);
      onStatusChange?.(data);
      toast.success('Estado actualizado');
    } catch {
      toast.error('No se pudo actualizar el estado');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentChange = async (newPayment: PaymentStatus) => {
    setIsUpdating(true);
    try {
      const { data } = await api.put<Appointment>(
        `/appointments/${appointment.id}`,
        { payment_status: newPayment }
      );
      setActivePayment((data.payment_status as PaymentStatus) ?? 'unpaid');
      onStatusChange?.(data);
      toast.success('Estado de pago actualizado');
    } catch {
      toast.error('No se pudo actualizar el pago');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/appointments/${appointment.id}`);
      toast.success('Turno eliminado correctamente');
      onDelete?.(appointment.id);
      onClose();
    } catch {
      toast.error('No se pudo eliminar el turno');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const statusColors: Record<string, { bg: string; border: string }> = {
    pending: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      border: 'border-amber-200 dark:border-amber-800/60',
    },
    confirmed: {
      bg: 'bg-sky-50 dark:bg-sky-950/60',
      border: 'border-sky-200 dark:border-sky-800/60',
    },
    completed: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      border: 'border-emerald-200 dark:border-emerald-800/60',
    },
    cancelled: {
      bg: 'bg-neutral-50 dark:bg-neutral-900/60',
      border: 'border-neutral-200 dark:border-neutral-700/60',
    },
  };

  const headerStyle = statusColors[activeStatus] ?? statusColors.pending;

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn('border-b px-6 py-6', headerStyle.bg, headerStyle.border)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border',
                  headerStyle.bg,
                  headerStyle.border
                )}
              >
                <User className="h-5 w-5 text-foreground/70" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Paciente
                </p>
                <h2 className="truncate text-lg font-semibold tracking-tight">
                  {patient}
                </h2>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn('gap-1.5 px-3 py-1', config.className)}
            >
              <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
              {config.label}
            </Badge>
            <CalendarSyncStatus
              appointmentId={appointment.id}
              appointmentStatus={activeStatus}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Fecha
                </span>
              </div>
              <p className="mt-2 text-sm font-medium capitalize">
                {format(scheduledDate, 'EEEE', { locale: es })}
              </p>
              <p className="text-lg font-semibold">
                {format(scheduledDate, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <div className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Hora
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {format(scheduledDate, 'HH:mm')}
              </p>
              <p className="text-sm text-muted-foreground">
                {display.duration_minutes} minutos
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Costo y pago
              </span>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-4">
              {treatmentsList.length > 0 && (
                <div className="space-y-2">
                  {treatmentsList.map((t) => (
                    <div key={t.id} className="flex justify-between text-sm">
                      <span>
                        {t.treatment_name} × {t.quantity}
                      </span>
                      <span className="tabular-nums">
                        {((t.quantity * t.unit_price_cents) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 font-medium">
                <span>Total</span>
                <span className="tabular-nums">
                  {(totalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado de pago
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(paymentConfig) as [
                      PaymentStatus,
                      { label: string; className: string },
                    ][]
                  ).map(([key, cfg]) => (
                    <Button
                      key={key}
                      variant={activePayment === key ? 'default' : 'outline'}
                      size="sm"
                      disabled={isUpdating || activePayment === key}
                      onClick={() => handlePaymentChange(key)}
                      className={cn(
                        'h-9 flex-1 sm:flex-none',
                        activePayment === key && cfg.className
                      )}
                    >
                      <Banknote className="mr-1.5 h-3.5 w-3.5" />
                      {cfg.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {display.notes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Notas
                </span>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm leading-relaxed">{display.notes}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cambiar estado
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Button
                  key={key}
                  variant={activeStatus === key ? 'default' : 'outline'}
                  size="sm"
                  disabled={isUpdating || activeStatus === key}
                  onClick={() => handleStatusChange(key)}
                  className={cn(
                    'h-10 justify-start rounded-lg',
                    activeStatus === key && 'pointer-events-none'
                  )}
                >
                  <span
                    className={cn(
                      'mr-2 h-2.5 w-2.5 rounded-full',
                      activeStatus === key
                        ? 'bg-primary-foreground'
                        : cfg.dotColor
                    )}
                  />
                  {cfg.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t bg-muted/30 p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-11 flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="h-11 flex-1" asChild>
            <Link to={`/app/patients/${display.patient_id}`}>
              <User className="mr-2 h-4 w-4" />
              Ver paciente
            </Link>
          </Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        appointmentInfo={`${format(scheduledDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })}`}
      />
    </div>
  );
}
