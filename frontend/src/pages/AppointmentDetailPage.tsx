import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppointmentDetailPanel } from '@/components/appointments';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-2 pt-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/appointments">← Turnos</Link>
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <AppointmentDetailPanel appointmentId={id ?? null} />
      </div>
    </div>
  );
}
