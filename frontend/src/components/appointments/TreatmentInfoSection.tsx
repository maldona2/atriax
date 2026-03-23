import { Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { AppointmentTreatmentRow } from '@/types';

const paymentLabels: Record<string, { label: string; className: string }> = {
  unpaid: {
    label: 'Impago',
    className:
      'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-200',
  },
  paid: {
    label: 'Pagado',
    className:
      'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200',
  },
  partial: {
    label: 'Parcial',
    className:
      'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/80 dark:border-sky-800 dark:text-sky-200',
  },
  refunded: {
    label: 'Reembolsado',
    className:
      'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-900/80 dark:border-neutral-700 dark:text-neutral-400',
  },
};

interface TreatmentInfoSectionProps {
  treatments: AppointmentTreatmentRow[];
  totalAmountCents: number | null;
  paymentStatus: string;
}

export function TreatmentInfoSection({
  treatments,
  totalAmountCents,
  paymentStatus,
}: TreatmentInfoSectionProps) {
  if (treatments.length === 0) return null;

  const paymentConfig = paymentLabels[paymentStatus] ?? paymentLabels.unpaid;
  const total = (totalAmountCents ?? 0) / 100;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tratamientos y pago
        </span>
      </div>

      <div className="space-y-2">
        {treatments.map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm">
            <span className="text-foreground">
              {t.treatment_name}{' '}
              <span className="text-muted-foreground">× {t.quantity}</span>
            </span>
            <span className="tabular-nums font-medium">
              ${((t.quantity * t.unit_price_cents) / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold tabular-nums">
          ${total.toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Estado de pago</span>
        <Badge
          variant="outline"
          className={cn('gap-1.5', paymentConfig.className)}
        >
          {paymentConfig.label}
        </Badge>
      </div>
    </div>
  );
}
