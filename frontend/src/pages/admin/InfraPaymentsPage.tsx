import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Clock, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import type { TenantPaymentSummary } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

/** '2026-07' -> 'julio 2026' */
function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const label = d.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatPaidAt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function InfraPaymentsPage() {
  const [rows, setRows] = useState<TenantPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchOverview() {
    setLoading(true);
    try {
      const { data } = await api.get<TenantPaymentSummary[]>(
        '/admin/infra-payments'
      );
      setRows(data);
    } catch {
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  async function toggleCurrentMonth(row: TenantPaymentSummary) {
    setBusyId(row.tenant_id);
    try {
      if (row.current_month_paid) {
        await api.delete(
          `/admin/tenants/${row.tenant_id}/infra-payments/${row.current_month}`
        );
        toast.success('Mes marcado como pendiente');
      } else {
        await api.post(`/admin/tenants/${row.tenant_id}/infra-payments`, {
          billingMonth: row.current_month,
        });
        toast.success('Mes marcado como pagado');
      }
      await fetchOverview();
    } catch {
      toast.error('No se pudo actualizar el pago');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pagos de infraestructura</h1>
        <p className="text-sm text-muted-foreground">
          Registrá el pago mensual de cada cliente
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No hay clientes todavía.</p>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const busy = busyId === row.tenant_id;
            return (
              <Card key={row.tenant_id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {row.tenant_name}
                    </CardTitle>
                    {row.user_email && (
                      <CardDescription>{row.user_email}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {row.current_month_paid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                        <Check className="size-3" />
                        {monthLabel(row.current_month)} pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <Clock className="size-3" />
                        {monthLabel(row.current_month)} pendiente
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant={row.current_month_paid ? 'outline' : 'default'}
                      disabled={busy}
                      onClick={() => toggleCurrentMonth(row)}
                    >
                      {busy && <Loader2 className="size-4 animate-spin" />}
                      {row.current_month_paid
                        ? 'Marcar pendiente'
                        : 'Marcar pagado'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Historial de pagos
                  </p>
                  {row.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin pagos registrados.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {row.payments.map((p) => (
                        <li
                          key={p.billing_month}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <span className="font-medium">
                            {monthLabel(p.billing_month)}
                          </span>
                          <span className="text-muted-foreground">
                            Pagado el {formatPaidAt(p.paid_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
