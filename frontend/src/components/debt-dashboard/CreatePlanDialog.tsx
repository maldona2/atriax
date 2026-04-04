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
import { usePatients } from '@/hooks/usePatients';
import { createPaymentPlan } from '@/lib/debtDashboardApi';
import type { CreatePaymentPlanInput } from '@/types/debtDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePlanDialog({ open, onClose, onSuccess }: Props) {
  const { patients, loading: loadingPatients } = usePatients();
  const [patientId, setPatientId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [frequency, setFrequency] =
    useState<CreatePaymentPlanInput['frequency']>('monthly');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setPatientId('');
    setTotalAmount('');
    setInstallmentAmount('');
    setFrequency('monthly');
    setStartDate('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!patientId) return setError('Seleccione un paciente');
    if (!startDate) return setError('Ingrese una fecha de inicio');

    const total = Math.round(parseFloat(totalAmount) * 100);
    const installment = Math.round(parseFloat(installmentAmount) * 100);

    if (!total || total <= 0)
      return setError('El monto total debe ser mayor a 0');
    if (!installment || installment <= 0)
      return setError('La cuota debe ser mayor a 0');
    if (installment > total)
      return setError('La cuota no puede superar el monto total');

    setSubmitting(true);
    try {
      await createPaymentPlan({
        patientId,
        totalAmountCents: total,
        installmentAmountCents: installment,
        frequency,
        startDate: new Date(startDate).toISOString(),
      });
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el plan';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear plan de pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select
              value={patientId}
              onValueChange={setPatientId}
              disabled={loadingPatients}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar paciente..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Monto total ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cuota ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setFrequency(v as CreatePaymentPlanInput['frequency'])
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
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
