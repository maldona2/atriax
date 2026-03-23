import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { statusConfig } from './constants';
import type { Appointment } from '@/types';

interface AppointmentCardProps {
  appointment: Appointment;
  isSelected: boolean;
  onClick: () => void;
}

export function AppointmentCard({
  appointment,
  isSelected,
  onClick,
}: AppointmentCardProps) {
  const config = statusConfig[appointment.status];
  const scheduledDate = parseISO(appointment.scheduled_at);
  const patientName =
    appointment.patient_last_name && appointment.patient_first_name
      ? `${appointment.patient_last_name}, ${appointment.patient_first_name}`
      : appointment.patient_first_name ||
        appointment.patient_last_name ||
        'Sin nombre';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-sm',
        isSelected &&
          'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tabular-nums text-muted-foreground">
            {format(scheduledDate, 'HH:mm')}
          </p>
          <p className="mt-0.5 truncate font-medium">{patientName}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 gap-1.5 px-2.5 py-0.5 text-xs',
            config?.className
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', config?.dotColor)} />
          {config?.label}
        </Badge>
      </div>
    </button>
  );
}
