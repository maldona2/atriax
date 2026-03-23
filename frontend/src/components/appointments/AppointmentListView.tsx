import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppointmentCard } from './AppointmentCard';
import type { Appointment } from '@/types';

interface AppointmentListViewProps {
  appointments: Appointment[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (apt: Appointment) => void;
  onNew: () => void;
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateFromChange: (d: Date | null) => void;
  onDateToChange: (d: Date | null) => void;
  status: Appointment['status'] | 'all';
  onStatusChange: (s: Appointment['status'] | 'all') => void;
  viewToggle?: ReactNode;
}

function groupByDate(appointments: Appointment[]) {
  const groups: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const key = apt.scheduled_at.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(apt);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function AppointmentListView({
  appointments,
  loading,
  selectedId,
  onSelect,
  onNew,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  status,
  onStatusChange,
  viewToggle,
}: AppointmentListViewProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const todayAnchorRef = useRef<HTMLDivElement>(null);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) =>
      a.scheduled_at.localeCompare(b.scheduled_at)
    );
  }, [appointments]);

  const grouped = useMemo(() => groupByDate(sorted), [sorted]);

  const pastGroups = useMemo(
    () => grouped.filter(([key]) => key < todayKey),
    [grouped, todayKey]
  );
  const upcomingGroups = useMemo(
    () => grouped.filter(([key]) => key >= todayKey),
    [grouped, todayKey]
  );

  useEffect(() => {
    if (!loading && todayAnchorRef.current) {
      todayAnchorRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [loading]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Turnos</h2>
            <Badge variant="secondary" className="tabular-nums">
              {appointments.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {viewToggle}
            <Button size="sm" onClick={onNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Date from */}
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'justify-start text-left font-normal',
                  !dateFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateFrom
                  ? format(dateFrom, 'd MMM yyyy', { locale: es })
                  : 'Desde'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom ?? undefined}
                onSelect={(d) => {
                  onDateFromChange(d ?? null);
                  setFromOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date to */}
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'justify-start text-left font-normal',
                  !dateTo && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dateTo
                  ? format(dateTo, 'd MMM yyyy', { locale: es })
                  : 'Hasta'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo ?? undefined}
                onSelect={(d) => {
                  onDateToChange(d ?? null);
                  setToOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Status filter */}
          <Select
            value={status}
            onValueChange={(v) =>
              onStatusChange(v as Appointment['status'] | 'all')
            }
          >
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <CalendarIcon className="mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Sin turnos</p>
              <p className="mt-1 text-sm">
                No hay turnos que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Past groups — dimmed */}
              {pastGroups.map(([dateKey, apts]) => {
                const dateLabel = format(
                  parseISO(dateKey),
                  "EEEE d 'de' MMMM",
                  { locale: es }
                );
                return (
                  <div key={dateKey} className="opacity-70">
                    <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 capitalize">
                      {dateLabel}
                    </p>
                    <div className="space-y-1.5">
                      {apts.map((apt) => (
                        <AppointmentCard
                          key={apt.id}
                          appointment={apt}
                          isSelected={selectedId === apt.id}
                          onClick={() => onSelect(apt)}
                          isPast={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Invisible scroll anchor for today */}
              <div ref={todayAnchorRef} />

              {/* Today + future groups or empty state */}
              {upcomingGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <CalendarIcon className="mb-3 h-10 w-10 opacity-30" />
                  <p className="font-medium">Sin turnos próximos</p>
                  <p className="mt-1 text-sm">
                    No hay turnos agendados para hoy ni los próximos días.
                  </p>
                </div>
              ) : (
                upcomingGroups.map(([dateKey, apts]) => {
                  const dateLabel = format(
                    parseISO(dateKey),
                    "EEEE d 'de' MMMM",
                    { locale: es }
                  );
                  return (
                    <div key={dateKey}>
                      <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                        {dateLabel}
                      </p>
                      <div className="space-y-1.5">
                        {apts.map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            isSelected={selectedId === apt.id}
                            onClick={() => onSelect(apt)}
                            isPast={false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
