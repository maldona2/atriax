import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PatientDetail } from '@/types';

interface PatientCardProps {
  patient: PatientDetail;
}

export function PatientCard({ patient }: PatientCardProps) {
  const unpaid = patient.unpaid_count ?? 0;
  const totalCents = patient.unpaid_total_cents ?? 0;

  return (
    <Link
      to={`/app/patients/${patient.id}`}
      className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 transition-colors active:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {patient.last_name}, {patient.first_name}
        </p>
        {patient.phone && (
          <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{patient.phone}</span>
          </div>
        )}
      </div>
      <div className="shrink-0">
        {unpaid === 0 ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
            Al día
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
            {unpaid} impago{unpaid !== 1 ? 's' : ''}
            {totalCents > 0 && ` · $${(totalCents / 100).toFixed(2)}`}
          </Badge>
        )}
      </div>
    </Link>
  );
}
