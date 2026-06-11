import type { DashboardKpis } from '@/types/dashboard';

function formatArs(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function KpisPanel({ kpis }: { kpis: DashboardKpis }) {
  const items = [
    { label: 'Turnos hoy', value: String(kpis.todayCount) },
    { label: 'Confirmados', value: String(kpis.confirmedCount) },
    { label: 'Pendientes', value: String(kpis.pendingCount) },
    { label: 'Ingresos del día', value: formatArs(kpis.todayRevenueCents) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border bg-card p-4 text-center"
        >
          <div className="text-2xl font-bold">{it.value}</div>
          <div className="text-xs uppercase text-muted-foreground">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
