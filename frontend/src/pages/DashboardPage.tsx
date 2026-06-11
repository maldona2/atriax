import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { CycleAlertsPanel } from '@/components/dashboard/CycleAlertsPanel';
import { TodayAppointmentsPanel } from '@/components/dashboard/TodayAppointmentsPanel';
import { KpisPanel } from '@/components/dashboard/KpisPanel';
import { DebtSummaryPanel } from '@/components/dashboard/DebtSummaryPanel';

export function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const { status } = useSubscription();
  const canSendWhatsApp = status?.features?.whatsappIntegration === true;

  if (loading && !data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? 'No se pudo cargar el panel.'}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-bold">Inicio</h1>

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
