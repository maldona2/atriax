import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, X, ArrowRight } from 'lucide-react';
import type { CycleAlert } from '@/types/dashboard';
import { dismissCycleAlert } from '@/lib/dashboardApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TreatmentRegistrySection } from '@/components/patients/TreatmentRegistrySection';

interface Props {
  upcoming: CycleAlert[];
  overdue: CycleAlert[];
  onRefresh: () => void;
}

type TabKey = 'overdue' | 'upcoming';

interface PatientGroup {
  patientId: string;
  patientName: string;
  alerts: CycleAlert[];
}

function groupByPatient(alerts: CycleAlert[]): PatientGroup[] {
  const map = new Map<string, CycleAlert[]>();
  for (const a of alerts) {
    const arr = map.get(a.patientId);
    if (arr) arr.push(a);
    else map.set(a.patientId, [a]);
  }
  const groups: PatientGroup[] = [...map.entries()].map(([patientId, list]) => ({
    patientId,
    patientName: list[0].patientName,
    // most overdue / soonest due first
    alerts: [...list].sort((x, y) => x.daysUntilDue - y.daysUntilDue),
  }));
  // groups with the most-overdue treatment first
  groups.sort(
    (g1, g2) =>
      Math.min(...g1.alerts.map((a) => a.daysUntilDue)) -
      Math.min(...g2.alerts.map((a) => a.daysUntilDue))
  );
  return groups;
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  );
}

function dueLabel(alert: CycleAlert, overdue: boolean): string {
  const n = Math.abs(alert.daysUntilDue);
  const plural = n === 1 ? '' : 's';
  return overdue ? `hace ${n} día${plural}` : `vence en ${n} día${plural}`;
}

function TreatmentRow({
  alert,
  overdue,
  onRefresh,
  onSelect,
}: {
  alert: CycleAlert;
  overdue: boolean;
  onRefresh: () => void;
  onSelect: () => void;
}) {
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await dismissCycleAlert(alert.patientTreatmentId);
      toast.success(`Alerta de ${alert.patientName} descartada`);
      onRefresh();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      toast.error(message || 'No se pudo descartar la alerta');
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-md py-1.5 pl-[38px] max-md:flex-wrap max-md:pl-0">
      <button
        type="button"
        onClick={onSelect}
        className="shrink-0 text-left text-[13px] hover:underline"
        title="Ver detalle del tratamiento"
      >
        {alert.treatmentName}
      </button>
      <span className="h-px min-w-3 flex-1 border-b border-dashed border-border max-md:hidden" />
      <span
        className={`whitespace-nowrap text-xs tabular-nums ${
          overdue ? 'text-destructive' : 'text-[oklch(0.78_0.15_80)]'
        }`}
      >
        {dueLabel(alert, overdue)}
      </span>
      {overdue && (
        <div className="flex shrink-0 items-center gap-1 max-md:ml-auto">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            title="Descartar alerta"
            aria-label="Descartar alerta"
            className="inline-flex h-[26px] items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  alert,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  alert: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-[0_1px_2px_oklch(0_0_0/30%)]'
          : 'text-muted-foreground'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[11px] font-semibold leading-4 tabular-nums ${
          active && alert
            ? 'bg-[oklch(0.704_0.191_22.216/10%)] text-destructive'
            : 'bg-accent text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ReminderList({
  alerts,
  overdue,
  onRefresh,
  onSelect,
}: {
  alerts: CycleAlert[];
  overdue: boolean;
  onRefresh: () => void;
  onSelect: (alert: CycleAlert) => void;
}) {
  const groups = useMemo(() => groupByPatient(alerts), [alerts]);

  if (groups.length === 0) {
    return (
      <p className="px-4 py-7 text-center text-[13px] text-muted-foreground">
        No hay recordatorios en esta lista.
      </p>
    );
  }

  return (
    <div className="max-h-[520px] overflow-y-auto">
      {groups.map((g) => (
        <div key={g.patientId} className="px-4 py-3 [&+&]:border-t">
          <div className="mb-1.5 flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
              {initials(g.patientName)}
            </div>
            <button
              type="button"
              onClick={() => onSelect(g.alerts[0])}
              className="min-w-0 flex-1 truncate text-left text-sm font-semibold capitalize hover:underline"
            >
              {g.patientName}
            </button>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {g.alerts.length} tratamiento{g.alerts.length === 1 ? '' : 's'}
            </span>
          </div>
          {g.alerts.map((a) => (
            <TreatmentRow
              key={a.patientTreatmentId}
              alert={a}
              overdue={overdue}
              onRefresh={onRefresh}
              onSelect={() => onSelect(a)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CycleAlertsPanel({ upcoming, overdue, onRefresh }: Props) {
  const empty = upcoming.length === 0 && overdue.length === 0;
  const [activeTab, setActiveTab] = useState<TabKey>(
    overdue.length > 0 ? 'overdue' : 'upcoming'
  );
  const [selected, setSelected] = useState<CycleAlert | null>(null);

  const activeAlerts = activeTab === 'overdue' ? overdue : upcoming;
  const patientCount = new Set(activeAlerts.map((a) => a.patientId)).size;

  return (
    <section
      aria-label="Recordatorios de ciclo"
      className="flex flex-col overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-muted-foreground" strokeWidth={1.75} />
          Recordatorios de ciclo
        </h2>
        {!empty && (
          <div
            role="tablist"
            className="inline-flex gap-0.5 rounded-md bg-secondary p-[3px]"
          >
            <TabButton
              active={activeTab === 'overdue'}
              label="Vencidos"
              count={overdue.length}
              alert
              onClick={() => setActiveTab('overdue')}
            />
            <TabButton
              active={activeTab === 'upcoming'}
              label="Próximos"
              count={upcoming.length}
              alert={false}
              onClick={() => setActiveTab('upcoming')}
            />
          </div>
        )}
      </div>

      {empty ? (
        <p className="px-4 py-7 text-center text-[13px] text-muted-foreground">
          No hay recordatorios pendientes.
        </p>
      ) : (
        <>
          <ReminderList
            alerts={activeAlerts}
            overdue={activeTab === 'overdue'}
            onRefresh={onRefresh}
            onSelect={setSelected}
          />
          <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {activeAlerts.length} tratamiento
              {activeAlerts.length === 1 ? '' : 's'}{' '}
              {activeTab === 'overdue'
                ? `vencido${activeAlerts.length === 1 ? '' : 's'}`
                : `próximo${activeAlerts.length === 1 ? '' : 's'}`}{' '}
              · {patientCount} paciente{patientCount === 1 ? '' : 's'}
            </span>
            <Link
              to="/app/patients"
              className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
            >
              Ver todos
              <ArrowRight className="size-[13px]" strokeWidth={1.75} />
            </Link>
          </div>
        </>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {selected.patientName}
                </DialogTitle>
                <DialogDescription>{selected.treatmentName}</DialogDescription>
              </DialogHeader>
              <TreatmentRegistrySection patientId={selected.patientId} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
