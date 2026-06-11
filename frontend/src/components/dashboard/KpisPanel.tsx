import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Banknote,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import type { DashboardKpis, DashboardDebtSummary } from '@/types/dashboard';

function formatArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const valueClass =
  'text-[26px] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums max-md:text-[22px]';
const labelClass =
  'flex items-center gap-1.5 text-xs font-medium text-muted-foreground';

export function KpisPanel({
  kpis,
  debtSummary,
}: {
  kpis: DashboardKpis;
  debtSummary: DashboardDebtSummary;
}) {
  const cards = [
    { label: 'Turnos hoy', icon: Calendar, value: String(kpis.todayCount) },
    {
      label: 'Confirmados',
      icon: CheckCircle2,
      value: String(kpis.confirmedCount),
    },
    { label: 'Pendientes', icon: Clock, value: String(kpis.pendingCount) },
    {
      label: 'Ingresos del día',
      icon: Banknote,
      value: formatArs(kpis.todayRevenueCents),
    },
  ];

  return (
    <section
      aria-label="Resumen del día"
      className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]"
    >
      {cards.map(({ label, icon: Icon, value }) => (
        <div
          key={label}
          className="flex min-w-0 flex-col gap-1.5 rounded-lg border bg-card px-4 py-3.5"
        >
          <div className={labelClass}>
            <Icon className="size-3.5" strokeWidth={1.75} />
            {label}
          </div>
          <div className={valueClass}>{value}</div>
        </div>
      ))}

      <Link
        to="/app/debt-dashboard"
        title="Ver panel de deudas"
        className="col-span-2 flex min-w-0 flex-col gap-1.5 rounded-lg border bg-card px-4 py-3.5 transition-colors hover:border-input hover:bg-[oklch(0.235_0_0)] min-[1100px]:col-span-1"
      >
        <div className={labelClass}>
          <BarChart2 className="size-3.5" strokeWidth={1.75} />
          Deuda pendiente
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className={valueClass}>
            {formatArs(debtSummary.totalPendingCents)}{' '}
            <small className="text-[13px] font-medium tracking-normal text-muted-foreground">
              · {debtSummary.patientCount} paciente
              {debtSummary.patientCount === 1 ? '' : 's'}
            </small>
          </div>
          <ArrowRight
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
        </div>
      </Link>
    </section>
  );
}
