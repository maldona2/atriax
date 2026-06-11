import { Link } from 'react-router-dom';
import type { DashboardDebtSummary } from '@/types/dashboard';

function formatArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DebtSummaryPanel({
  summary,
}: {
  summary: DashboardDebtSummary;
}) {
  return (
    <Link
      to="/app/debt-dashboard"
      className="block rounded-lg border bg-card p-4 hover:bg-accent"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase text-muted-foreground">
        Deuda pendiente
      </h2>
      <p className="text-sm">
        <span className="text-lg font-bold">
          {formatArs(summary.totalPendingCents)}
        </span>{' '}
        · {summary.patientCount} paciente
        {summary.patientCount === 1 ? '' : 's'} con saldo →
      </p>
    </Link>
  );
}
