import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordPayment } from '@/lib/debtDashboardApi';
import type { PaymentPlan } from '@/types/debtDashboard';

interface Props {
  plan: PaymentPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentDialog({ plan, onClose, onSuccess }: Props) {
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentStatus, setPaymentStatus] = useState<'on_time' | 'late'>(
    'on_time'
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!plan) return;
    setError(null);

    if (!paymentDate) return setError('Ingrese la fecha del pago');

    setSubmitting(true);
    try {
      await recordPayment(plan.id, {
        paymentDate: new Date(paymentDate).toISOString(),
        paymentStatus,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al registrar el pago';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={plan !== null} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>

        {plan && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">Paciente</p>
              <p className="font-medium">{plan.patientName}</p>
              <p className="mt-1 text-muted-foreground">
                Cuota:{' '}
                <span className="font-medium text-foreground">
                  ${(plan.installmentAmountCents / 100).toLocaleString('es-AR')}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha del pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estado del pago</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v as 'on_time' | 'late')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_time">A tiempo</SelectItem>
                  <SelectItem value="late">Con atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
