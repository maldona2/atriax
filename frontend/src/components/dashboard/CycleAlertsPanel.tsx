import { useState } from 'react';
import { toast } from 'sonner';
import type { CycleAlert } from '@/types/dashboard';
import { sendCycleReminder, dismissCycleAlert } from '@/lib/dashboardApi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TreatmentRegistrySection } from '@/components/patients/TreatmentRegistrySection';

const PAGE_SIZE = 10;

interface Props {
  upcoming: CycleAlert[];
  overdue: CycleAlert[];
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
}

function AlertRow({
  alert,
  overdue,
  canSendWhatsApp,
  onReminderSent,
  onSelect,
}: {
  alert: CycleAlert;
  overdue: boolean;
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
  onSelect: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const label = overdue
    ? `Vencido hace ${Math.abs(alert.daysUntilDue)} día${
        Math.abs(alert.daysUntilDue) === 1 ? '' : 's'
      }`
    : `Vence en ${alert.daysUntilDue} día${alert.daysUntilDue === 1 ? '' : 's'}`;

  async function handleSend() {
    setSending(true);
    try {
      await sendCycleReminder(alert.patientTreatmentId);
      toast.success(`Recordatorio enviado a ${alert.patientName}`);
      onReminderSent();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      toast.error(message || 'No se pudo enviar el recordatorio');
    } finally {
      setSending(false);
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      await dismissCycleAlert(alert.patientTreatmentId);
      toast.success(`Alerta de ${alert.patientName} descartada`);
      onReminderSent();
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
    <div
      className={`flex items-center justify-between rounded-md border-l-4 p-3 ${
        overdue
          ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
          : 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 truncate text-left text-sm hover:underline"
        title="Ver detalle del tratamiento"
      >
        <span className="font-medium">{alert.patientName}</span> ·{' '}
        {alert.treatmentName}{' '}
        <span className="text-muted-foreground">— {label}</span>
      </button>
      <div className="flex items-center gap-2">
        {canSendWhatsApp && alert.patientPhone && (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || dismissing}
            className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? 'Enviando…' : 'WhatsApp'}
          </button>
        )}
        {overdue && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={sending || dismissing}
            className="rounded-md border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            {dismissing ? 'Descartando…' : 'Descartar'}
          </button>
        )}
      </div>
    </div>
  );
}

function PaginatedAlerts({
  alerts,
  overdue,
  canSendWhatsApp,
  onReminderSent,
  onSelect,
}: {
  alerts: CycleAlert[];
  overdue: boolean;
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
  onSelect: (alert: CycleAlert) => void;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const visible = alerts.slice(start, start + PAGE_SIZE);

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay recordatorios en esta lista.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <AlertRow
          key={a.patientTreatmentId}
          alert={a}
          overdue={overdue}
          canSendWhatsApp={canSendWhatsApp}
          onReminderSent={onReminderSent}
          onSelect={() => onSelect(a)}
        />
      ))}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
            className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {safePage + 1} de {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

export function CycleAlertsPanel({
  upcoming,
  overdue,
  canSendWhatsApp,
  onReminderSent,
}: Props) {
  const empty = upcoming.length === 0 && overdue.length === 0;
  const defaultTab = overdue.length > 0 ? 'overdue' : 'upcoming';
  const [selected, setSelected] = useState<CycleAlert | null>(null);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
        Recordatorios de ciclo
      </h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">
          No hay recordatorios pendientes.
        </p>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="overdue">
              Vencidos ({overdue.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Próximos ({upcoming.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overdue">
            <PaginatedAlerts
              alerts={overdue}
              overdue
              canSendWhatsApp={canSendWhatsApp}
              onReminderSent={onReminderSent}
              onSelect={setSelected}
            />
          </TabsContent>
          <TabsContent value="upcoming">
            <PaginatedAlerts
              alerts={upcoming}
              overdue={false}
              canSendWhatsApp={canSendWhatsApp}
              onReminderSent={onReminderSent}
              onSelect={setSelected}
            />
          </TabsContent>
        </Tabs>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.patientName}</DialogTitle>
                <DialogDescription>{selected.treatmentName}</DialogDescription>
              </DialogHeader>
              <TreatmentRegistrySection patientId={selected.patientId} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
