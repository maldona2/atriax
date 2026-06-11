import { Link } from 'react-router-dom';
import type { DashboardAppointment } from '@/types/dashboard';

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function TodayAppointmentsPanel({
  appointments,
}: {
  appointments: DashboardAppointment[];
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
        Turnos de hoy
      </h2>
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay turnos para hoy.</p>
      ) : (
        <ul className="divide-y">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <Link
                to={`/app/appointments/${a.id}`}
                className="text-sm hover:underline"
              >
                {formatTime(a.scheduled_at)} ·{' '}
                {a.patient_first_name ?? ''} {a.patient_last_name ?? ''}
              </Link>
              <span className="text-xs text-muted-foreground">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
