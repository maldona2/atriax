import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { CycleAlertsPanel } from '@/components/dashboard/CycleAlertsPanel';
import { TodayAppointmentsPanel } from '@/components/dashboard/TodayAppointmentsPanel';
import { KpisPanel } from '@/components/dashboard/KpisPanel';
import { DebtSummaryPanel } from '@/components/dashboard/DebtSummaryPanel';
import { Skeleton } from '@/components/ui/skeleton';

function PanelSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />
      <PanelSkeleton rows={3} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={2} />
      </div>
      <PanelSkeleton rows={1} />
    </div>
  );
}

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const { status } = useSubscription();
  const canSendWhatsApp = status?.features?.whatsappIntegration === true;

  if (loading && !data) {
    return <DashboardSkeleton />;
  }
  if (error || !data) {
    return (
      <div className="text-sm text-red-600">
        {error ?? 'No se pudo cargar el panel.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold leading-none">Inicio</h1>

      <CycleAlertsPanel
        upcoming={data.cycleAlerts.upcoming}
        overdue={data.cycleAlerts.overdue}
        canSendWhatsApp={canSendWhatsApp}
        onReminderSent={refetch}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayAppointmentsPanel appointments={data.todayAppointments} />
        <KpisPanel kpis={data.kpis} />
      </div>

      <DebtSummaryPanel summary={data.debtSummary} />
    </div>
  );
}
