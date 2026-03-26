import { Badge } from '@/components/ui/badge';
import type { PatientPaymentRecord } from '@/types/debtDashboard';

function formatCurrency(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-AR')}`;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'Pagado',
    className: 'bg-primary/20 text-primary hover:bg-primary/30',
  },
  partially_paid: {
    label: 'Parcial',
    className: 'bg-chart-3/20 text-chart-3 hover:bg-chart-3/30',
  },
  unpaid: {
    label: 'Pendiente',
    className: 'bg-destructive/20 text-destructive hover:bg-destructive/30',
  },
};

interface PaymentHistoryCardProps {
  record: PatientPaymentRecord;
  onClick: (_r: PatientPaymentRecord) => void;
}

export function PaymentHistoryCard({
  record,
  onClick,
}: PaymentHistoryCardProps) {
  const status = statusConfig[record.paymentStatus];

  return (
    <button
      type="button"
      className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors active:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onClick(record)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{record.patientName}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-primary">
            {formatCurrency(record.paidCents)} cobrado
          </span>
          {record.unpaidCents > 0 && (
            <span className="text-destructive">
              {formatCurrency(record.unpaidCents)} pendiente
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {status ? (
          <Badge className={status.className}>{status.label}</Badge>
        ) : (
          <Badge variant="secondary">{record.paymentStatus}</Badge>
        )}
      </div>
    </button>
  );
}
