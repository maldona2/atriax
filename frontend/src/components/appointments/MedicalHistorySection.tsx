import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatientSessions } from '@/hooks/usePatientSessions';
import type { PreviousSession } from '@/types';

interface MedicalHistorySectionProps {
  patientId: string;
  excludeSessionId: string | null;
}

function SessionCard({ session }: { session: PreviousSession }) {
  const [expanded, setExpanded] = useState(false);
  const date = session.scheduled_at
    ? format(parseISO(session.scheduled_at), "d 'de' MMMM yyyy", { locale: es })
    : '—';
  const truncated =
    session.procedures_performed.length > 120
      ? session.procedures_performed.slice(0, 120) + '…'
      : session.procedures_performed;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium capitalize">{date}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {expanded ? session.procedures_performed : truncated}
      </p>
      {expanded && session.recommendations && (
        <div className="border-t pt-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Recomendaciones
          </p>
          <p className="text-sm leading-relaxed">{session.recommendations}</p>
        </div>
      )}
    </div>
  );
}

export function MedicalHistorySection({
  patientId,
  excludeSessionId,
}: MedicalHistorySectionProps) {
  const { sessions, loading } = usePatientSessions(patientId, excludeSessionId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Historial de sesiones
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-center text-muted-foreground">
          Primera visita del paciente
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
