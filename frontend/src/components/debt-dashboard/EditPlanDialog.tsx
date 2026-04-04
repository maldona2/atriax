import { useState, useEffect } from 'react';
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
import { updatePaymentPlan } from '@/lib/debtDashboardApi';
import type { PaymentPlan } from '@/types/debtDashboard';

interface Props {
  plan: PaymentPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPlanDialog({ plan, onClose, onSuccess }: Props) {
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [frequency, setFrequency] =
    useState<PaymentPlan['frequency']>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (plan) {
      setInstallmentAmount((plan.installmentAmountCents / 100).toFixed(2));
      setFrequency(plan.frequency);
      setNextPaymentDate(
        plan.nextPaymentDate
          ? new Date(plan.nextPaymentDate).toISOString().split('T')[0]
          : ''
      );
      setError(null);
    }
  }, [plan]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!plan) return;
    setError(null);

    const installment = Math.round(parseFloat(installmentAmount) * 100);
    if (!installment || installment <= 0) {
      return setError('La cuota debe ser mayor a 0');
    }

    const totalPayments = plan.onTimePayments + plan.latePayments;
    const remaining = Math.max(
      0,
      plan.totalAmountCents - plan.installmentAmountCents * totalPayments
    );
    if (installment > remaining) {
      return setError(
        `La cuota no puede superar el saldo restante ($${(remaining / 100).toFixed(2)})`
      );
    }

    setSubmitting(true);
    try {
      await updatePaymentPlan(plan.id, {
        installmentAmountCents: installment,
        frequency,
        nextPaymentDate: nextPaymentDate
          ? new Date(nextPaymentDate).toISOString()
          : undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al actualizar el plan';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPayments = plan ? plan.onTimePayments + plan.latePayments : 0;
  const remaining = plan
    ? Math.max(
        0,
        plan.totalAmountCents - plan.installmentAmountCents * totalPayments
      )
    : 0;

  return (
    <Dialog open={plan !== null} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar plan de pago</DialogTitle>
        </DialogHeader>

        {plan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Paciente</p>
                <p className="font-medium">{plan.patientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo restante</p>
                <p className="font-medium">
                  ${(remaining / 100).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cuota ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Frecuencia</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) =>
                    setFrequency(v as PaymentPlan['frequency'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Próximo pago</Label>
                <Input
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
