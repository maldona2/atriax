import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { CycleAlertsPanel } from '@/components/dashboard/CycleAlertsPanel';
import { TodayAppointmentsPanel } from '@/components/dashboard/TodayAppointmentsPanel';
import { KpisPanel } from '@/components/dashboard/KpisPanel';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 min-[1100px]:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-lg" />
        ))}
      </div>
      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
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
      <div className="text-sm text-destructive">
        {error ?? 'No se pudo cargar el panel.'}
      </div>
    );
  }

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
            Inicio
          </h1>
          <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">
            {today}
          </p>
        </div>
      </div>

      <KpisPanel kpis={data.kpis} debtSummary={data.debtSummary} />

      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <TodayAppointmentsPanel appointments={data.todayAppointments} />
        <CycleAlertsPanel
          upcoming={data.cycleAlerts.upcoming}
          overdue={data.cycleAlerts.overdue}
          canSendWhatsApp={canSendWhatsApp}
          onReminderSent={refetch}
        />
      </div>
    </div>
  );
}
