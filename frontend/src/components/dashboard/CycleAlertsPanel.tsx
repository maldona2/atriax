import { useState } from 'react';
import { toast } from 'sonner';
import type { CycleAlert } from '@/types/dashboard';
import { sendCycleReminder } from '@/lib/dashboardApi';

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
}: {
  alert: CycleAlert;
  overdue: boolean;
  canSendWhatsApp: boolean;
  onReminderSent: () => void;
}) {
  const [sending, setSending] = useState(false);

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

  return (
    <div
      className={`flex items-center justify-between rounded-md border-l-4 p-3 ${
        overdue
          ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30'
          : 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30'
      }`}
    >
      <div className="text-sm">
        <span className="font-medium">{alert.patientName}</span> ·{' '}
        {alert.treatmentName}{' '}
        <span className="text-muted-foreground">— {label}</span>
      </div>
      {canSendWhatsApp && alert.patientPhone && (
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'WhatsApp'}
        </button>
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
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-red-600">
                Vencidos
              </div>
              {overdue.map((a) => (
                <AlertRow
                  key={a.patientTreatmentId}
                  alert={a}
                  overdue
                  canSendWhatsApp={canSendWhatsApp}
                  onReminderSent={onReminderSent}
                />
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-amber-600">
                Próximos
              </div>
              {upcoming.map((a) => (
                <AlertRow
                  key={a.patientTreatmentId}
                  alert={a}
                  overdue={false}
                  canSendWhatsApp={canSendWhatsApp}
                  onReminderSent={onReminderSent}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
