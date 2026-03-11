import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HOUR_HEIGHT, HOURS, START_HOUR, statusConfig } from './constants';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import type { Appointment } from '@/types';

interface AppointmentsWeekGridProps {
  currentDate: Date;
  weekDays: Date[];
  filteredAppointments: Appointment[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onNewAppointment: (date?: Date) => void;
  onAppointmentClick: (apt: Appointment) => void;
}

function getAppointmentsForDay(
  appointments: Appointment[],
  day: Date
): Appointment[] {
  return appointments.filter((apt) =>
    isSameDay(parseISO(apt.scheduled_at), day)
  );
}

function calculatePosition(apt: Appointment) {
  const date = parseISO(apt.scheduled_at);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const top = (hours - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
  const height = (apt.duration_minutes / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(height, 24) };
}

export function AppointmentsWeekGrid({
  currentDate,
  weekDays,
  filteredAppointments,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onNewAppointment,
  onAppointmentClick,
}: AppointmentsWeekGridProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onToday}>
            Hoy
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onPreviousWeek}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNextWeek}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-medium">
            {format(weekStart, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-[auto_repeat(7,1fr)] border-b">
        <div className="w-16 border-r" />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dayAppointments = getAppointmentsForDay(
            filteredAppointments,
            day
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex flex-col items-center border-r py-2 last:border-r-0',
                isToday && 'bg-primary/5'
              )}
            >
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {format(day, 'EEE', { locale: es })}
              </span>
              <span
                className={cn(
                  'mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  isToday && 'bg-primary text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </span>
              {dayAppointments.length > 0 && (
                <span className="mt-1 text-xs text-muted-foreground">
                  {dayAppointments.length} turno
                  {dayAppointments.length !== 1 && 's'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div
          className="grid w-full min-w-0 grid-cols-[auto_repeat(7,1fr)]"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          <div className="w-16 border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute top-1 right-2 text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayAppointments = getAppointmentsForDay(
              filteredAppointments,
              day
            );

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'relative border-r last:border-r-0',
                  isToday && 'bg-primary/5'
                )}
                onClick={() => onNewAppointment(day)}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-dashed border-border/50"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {isToday && <CurrentTimeIndicator />}
                {dayAppointments.map((apt) => {
                  const { top, height } = calculatePosition(apt);
                  const config = statusConfig[apt.status];
                  return (
                    <button
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                      className={cn(
                        'absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border px-2 py-1 text-left transition-all',
                        config.className
                      )}
                      style={{ top, height }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full',
                            config.dotColor
                          )}
                        />
                        <span className="truncate text-xs font-medium">
                          {apt.patient_last_name && apt.patient_first_name
                            ? `${apt.patient_last_name}, ${apt.patient_first_name}`
                            : apt.patient_first_name ||
                              apt.patient_last_name ||
                              'Sin nombre'}
                        </span>
                      </div>
                      {height >= 40 && (
                        <p className="mt-0.5 truncate text-xs opacity-75">
                          {format(parseISO(apt.scheduled_at), 'HH:mm')} ·{' '}
                          {apt.duration_minutes}min
                        </p>
                      )}
                      {height >= 56 && apt.notes && (
                        <p className="mt-0.5 truncate text-xs opacity-60">
                          {apt.notes}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </main>
  );
}
