import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet,
  Copy,
  Check,
  RefreshCw,
  Server,
  MessageCircle,
  Clock,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { BillingStatus } from '@/types';

/**
 * Datos de facturación. Editá estos valores si cambian los costos.
 * El total en pesos se calcula con el dólar oficial (venta) en vivo.
 */
const ALIAS = 'molpo.';
const MONTHLY_USD = 28; // lo que se cobra (redondeado)
const FALLBACK_RATE = 1505; // venta oficial de respaldo si la API falla

const COSTS = [
  {
    icon: Server,
    label: 'Servicios y dominio',
    detail: 'Hosting + envío de emails',
    usd: 25,
  },
  {
    icon: MessageCircle,
    label: 'Mensajes de WhatsApp',
    detail: 'Recordatorios a pacientes',
    usd: 1.5,
  },
] as const;

const arsFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const usdFmt = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function BillingInfoPage() {
  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);

  async function loadRate() {
    setLoading(true);
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
      if (!res.ok) throw new Error('bad status');
      const data = (await res.json()) as {
        venta: number;
        fechaActualizacion: string;
      };
      setRate(data.venta);
      setUpdatedAt(data.fechaActualizacion);
      setIsFallback(false);
    } catch {
      setRate(FALLBACK_RATE);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRate();
    api
      .get<BillingStatus>('/billing/status')
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(ALIAS);
      setCopied(true);
      toast.success('Alias copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  const totalArs = MONTHLY_USD * rate;
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
          Facturación
        </h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Costos mensuales de la app y datos para transferir
        </p>
      </div>

      {/* Total a transferir */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <Wallet className="size-3.5" />
            Total a transferir este mes
          </CardDescription>
          <CardTitle className="text-[34px] font-bold tracking-tight text-primary">
            {loading ? '—' : arsFmt.format(totalArs)}
          </CardTitle>
          {status &&
            (status.paid ? (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                <Check className="size-3" />
                Pagado este mes
              </span>
            ) : (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Clock className="size-3" />
                Pendiente de pago
              </span>
            ))}
        </CardHeader>
        <CardContent className="space-y-1 text-[13px] text-muted-foreground">
          <p>
            USD {usdFmt.format(MONTHLY_USD)} × {arsFmt.format(rate)} (dólar
            oficial, venta)
          </p>
          <div className="flex items-center gap-2">
            {isFallback ? (
              <span className="text-amber-600 dark:text-amber-500">
                Cotización de respaldo (no se pudo actualizar en vivo)
              </span>
            ) : (
              updatedLabel && <span>Cotización al {updatedLabel}</span>
            )}
            <button
              onClick={loadRate}
              disabled={loading}
              className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3 ${loading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Cómo pagar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo pagar</CardTitle>
          <CardDescription>Transferencia mensual al siguiente alias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Alias
              </p>
              <p className="font-mono text-lg font-semibold">{ALIAS}</p>
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
        </CardContent>
      </Card>

      {/* Desglose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">En qué se va la plata</CardTitle>
          <CardDescription>Costos reales de infraestructura por mes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {COSTS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    USD {usdFmt.format(c.usd)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {arsFmt.format(c.usd * rate)}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2.5">
            <p className="text-sm font-semibold">Total (redondeado)</p>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">
                USD {usdFmt.format(MONTHLY_USD)}
              </p>
              <p className="text-xs text-muted-foreground">
                {arsFmt.format(totalArs)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Nota: la suscripción de MercadoPago no está en uso. El único pago es
        esta transferencia mensual. El monto en pesos varía según el dólar
        oficial del día.
      </p>
    </div>
  );
}
