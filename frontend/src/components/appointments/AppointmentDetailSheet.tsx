import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import { statusConfig } from './constants';
import type { Appointment } from '@/types';

interface AppointmentDetailSheetProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: (updated: Appointment) => void;
}

export function AppointmentDetailSheet({
  appointment,
  onClose,
  onStatusChange,
}: AppointmentDetailSheetProps) {
  const [activeStatus, setActiveStatus] = useState(appointment.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const config = statusConfig[activeStatus];
  const patient =
    appointment.patient_last_name && appointment.patient_first_name
      ? `${appointment.patient_last_name}, ${appointment.patient_first_name}`
      : appointment.patient_first_name ||
        appointment.patient_last_name ||
        'Sin nombre';
  const scheduledDate = parseISO(appointment.scheduled_at);

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
          <Badge
            variant="outline"
            className={cn('shrink-0 gap-1.5 px-3 py-1', config.className)}
          >
            <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
            {config.label}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-3">
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
                {appointment.duration_minutes} minutos
              </p>
            </div>
          </div>

          {appointment.notes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Notas
                </span>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm leading-relaxed">{appointment.notes}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cambiar estado
            </p>
            <div className="grid grid-cols-2 gap-2">
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
          <Button variant="outline" className="h-11 flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="h-11 flex-1" asChild>
            <Link to={`/app/patients/${appointment.patient_id}`}>
              <User className="mr-2 h-4 w-4" />
              Ver paciente
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
