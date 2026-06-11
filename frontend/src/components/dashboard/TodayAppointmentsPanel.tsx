import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Moon } from 'lucide-react';
import type { DashboardAppointment } from '@/types/dashboard';

type Status = DashboardAppointment['status'];

const STATUS: Record<Status, { label: string; color: string; soft: string }> = {
  confirmed: {
    label: 'Confirmado',
    color: 'oklch(0.72 0.17 150)',
    soft: 'oklch(0.72 0.17 150 / 12%)',
  },
  pending: {
    label: 'Pendiente',
    color: 'oklch(0.78 0.15 80)',
    soft: 'oklch(0.78 0.15 80 / 12%)',
  },
  completed: {
    label: 'Completado',
    color: 'oklch(0.708 0 0)',
    soft: 'oklch(0.708 0 0 / 12%)',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'oklch(0.704 0.191 22.216)',
    soft: 'oklch(0.704 0.191 22.216 / 12%)',
  },
  'no-show': {
    label: 'No asistió',
    color: 'oklch(0.704 0.191 22.216)',
    soft: 'oklch(0.704 0.191 22.216 / 12%)',
  },
};

const timeFmt = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Argentina/Buenos_Aires',
});

function timeParts(iso: string | null): { time: string; period: string } {
  if (!iso) return { time: '--:--', period: '' };
  const parts = timeFmt.formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
  return { time: `${hour}:${minute}`, period };
}

export function TodayAppointmentsPanel({
  appointments,
}: {
  appointments: DashboardAppointment[];
}) {
  return (
    <section
      aria-label="Turnos de hoy"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Turnos de hoy
        </h2>
        <Link
          to="/app/appointments"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Ver agenda
          <ArrowRight className="size-3.5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="flex flex-col">
        {appointments.map((a, i) => {
          const status = STATUS[a.status] ?? STATUS.pending;
          const { time, period } = timeParts(a.scheduled_at);
          const name =
            `${a.patient_first_name ?? ''} ${a.patient_last_name ?? ''}`.trim() ||
            'Paciente';
          return (
            <Link
              key={a.id}
              to={`/app/appointments/${a.id}`}
              className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[oklch(0.235_0_0)] ${
                i > 0 ? 'border-t' : ''
              }`}
            >
              <div className="flex w-16 shrink-0 flex-col items-start tabular-nums">
                <b className="text-[15px] font-semibold leading-tight">{time}</b>
                {period && (
                  <span className="text-[11px] text-muted-foreground">
                    {period}
                  </span>
                )}
              </div>
              <div
                className="w-[3px] self-stretch rounded-[2px]"
                style={{ background: status.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{name}</div>
                <div className="mt-px text-xs text-muted-foreground">
                  {a.duration_minutes ?? 60} min
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ color: status.color, background: status.soft }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: status.color }}
                />
                {status.label}
              </span>
            </Link>
          );
        })}

        <div className="flex items-center gap-2.5 border-t border-dashed px-4 py-3.5 text-[13px] text-muted-foreground">
          <Moon className="size-[15px]" strokeWidth={1.75} />
          <span>
            {appointments.length === 0
              ? 'No hay turnos para hoy.'
              : 'No hay más turnos hoy.'}
          </span>
        </div>
      </div>
    </section>
  );
}
