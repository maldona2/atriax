import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Copy, Lock, Wallet } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { BILLING_ALIAS, BILLING_MONTHLY_USD } from '@/config/billing';
import type { BillingStatus } from '@/types';

const SNOOZE_KEY = 'billing_reminder_snoozed_on';

/** Local calendar day, used to show the reminder at most once per day. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function monthLabel(billingMonth: string): string {
  return new Date(`${billingMonth}-01T00:00:00Z`).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Monthly payment reminder for manual-transfer accounts. Shows once a day
 * while the payment is pending, and becomes a blocking lock screen once the
 * due day has passed (the API rejects everything at that point too).
 */
export function BillingReminderDialog() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [snoozedToday, setSnoozedToday] = useState(
    () => localStorage.getItem(SNOOZE_KEY) === todayKey()
  );
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const isManual = user?.billingMode === 'manual_transfer';

  const loadStatus = useCallback(async () => {
    const { data } = await api.get<BillingStatus>('/billing/status');
    setStatus(data);
    return data;
  }, []);

  useEffect(() => {
    if (!isManual) return;
    loadStatus().catch(() => setStatus(null));
  }, [isManual, loadStatus]);

  if (!isManual || !status || status.paid) return null;
  if (!status.overdue && snoozedToday) return null;

  const locked = status.overdue;

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, todayKey());
    setSnoozedToday(true);
  };

  const copyAlias = async () => {
    try {
      await navigator.clipboard.writeText(BILLING_ALIAS);
      setCopied(true);
      toast.success('Alias copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const recheck = async () => {
    setChecking(true);
    try {
      const next = await loadStatus();
      if (next.paid) {
        toast.success('Pago confirmado. ¡Gracias!');
      } else {
        toast.info('Todavía no figura el pago. Puede tardar unas horas.');
      }
    } catch {
      toast.error('No se pudo verificar el pago');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !locked) snooze();
      }}
    >
      <DialogContent
        showCloseButton={!locked}
        onEscapeKeyDown={(e) => {
          if (locked) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (locked) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {locked ? (
              <Lock className="size-4 text-destructive" />
            ) : (
              <Wallet className="size-4 text-primary" />
            )}
            {locked
              ? 'Acceso suspendido por falta de pago'
              : 'Pago mensual pendiente'}
          </DialogTitle>
          <DialogDescription>
            {locked
              ? `El pago de ${monthLabel(status.billing_month)} venció el día ${status.due_day} y la aplicación queda bloqueada hasta que se registre la transferencia.`
              : `Todavía no registramos el pago de ${monthLabel(status.billing_month)}. Vence el día ${status.due_day}; si no se paga, se cierra el acceso a la aplicación.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Alias · USD {BILLING_MONTHLY_USD} al dólar oficial
            </p>
            <p className="font-mono text-lg font-semibold">{BILLING_ALIAS}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyAlias}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>

        <DialogFooter>
          {locked ? (
            <>
              <Button variant="outline" onClick={logout}>
                Cerrar sesión
              </Button>
              <Button onClick={recheck} disabled={checking}>
                Ya transferí
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={snooze}>
                Recordar mañana
              </Button>
              <Button
                onClick={() => {
                  snooze();
                  navigate('/app/billing');
                }}
              >
                Ver facturación
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
