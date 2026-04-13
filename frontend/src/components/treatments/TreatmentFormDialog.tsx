import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CalendarDays, Repeat, ArrowRight } from 'lucide-react';
import type { Treatment } from '@/types';

interface TreatmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment?: Treatment | null;
  onSubmit: (data: {
    name: string;
    price_cents: number;
    cost_cents?: number | null;
    initial_frequency_weeks?: number | null;
    initial_sessions_count?: number | null;
    maintenance_frequency_weeks?: number | null;
    protocol_notes?: string | null;
  }) => Promise<void>;
}

export function TreatmentFormDialog({
  open,
  onOpenChange,
  treatment,
  onSubmit,
}: TreatmentFormDialogProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [initialFrequency, setInitialFrequency] = useState('');
  const [initialSessions, setInitialSessions] = useState('');
  const [maintenanceFrequency, setMaintenanceFrequency] = useState('');
  const [protocolNotes, setProtocolNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);

  useEffect(() => {
    if (treatment) {
      setName(treatment.name);
      setPrice((treatment.price_cents / 100).toString());
      setCost(
        treatment.cost_cents !== null
          ? (treatment.cost_cents / 100).toString()
          : ''
      );
      setInitialFrequency(treatment.initial_frequency_weeks?.toString() ?? '');
      setInitialSessions(treatment.initial_sessions_count?.toString() ?? '');
      setMaintenanceFrequency(
        treatment.maintenance_frequency_weeks?.toString() ?? ''
      );
      setProtocolNotes(treatment.protocol_notes ?? '');
      setShowProtocol(
        !!treatment.initial_frequency_weeks ||
          !!treatment.initial_sessions_count ||
          !!treatment.maintenance_frequency_weeks
      );
    } else {
      setName('');
      setPrice('');
      setCost('');
      setInitialFrequency('');
      setInitialSessions('');
      setMaintenanceFrequency('');
      setProtocolNotes('');
      setShowProtocol(false);
    }
  }, [treatment, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cents = Math.round(parseFloat(price || '0') * 100);
    const costCents = cost ? Math.round(parseFloat(cost) * 100) : null;

    if (!name.trim() || cents < 0 || (costCents !== null && costCents < 0))
      return;

    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        price_cents: cents,
        cost_cents: costCents,
        initial_frequency_weeks: initialFrequency
          ? parseInt(initialFrequency, 10)
          : undefined,
        initial_sessions_count: initialSessions
          ? parseInt(initialSessions, 10)
          : undefined,
        maintenance_frequency_weeks: maintenanceFrequency
          ? parseInt(maintenanceFrequency, 10)
          : undefined,
        protocol_notes: protocolNotes || undefined,
      });

      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setPrice(value);
    }
  }

  function handleCostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setCost(value);
    }
  }

  function handleNumberChange(
    setter: React.Dispatch<React.SetStateAction<string>>
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*$/.test(value) || value === '') {
        setter(value);
      }
    };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:gap-4 sm:p-4">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col max-sm:h-full max-sm:overflow-hidden"
        >
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-0 sm:pt-0">
            <DialogTitle>
              {treatment ? 'Editar tratamiento' : 'Nuevo tratamiento'}
            </DialogTitle>
            <DialogDescription>
              {treatment
                ? 'Modifica el nombre, precio y protocolo del tratamiento.'
                : 'Define un tratamiento con su precio y protocolo por defecto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 sm:px-0">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Depilación láser"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio (moneda local)</Label>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Se guarda en centavos internamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Costo del tratamiento</Label>
                <Input
                  id="cost"
                  type="text"
                  inputMode="decimal"
                  value={cost}
                  onChange={handleCostChange}
                  placeholder="Opcional - costo de productos/servicios"
                />
                <p className="text-xs text-muted-foreground">
                  Costo de productos, servicios o insumos utilizados
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showProtocol" className="font-normal">
                  Agregar protocolo de seguimiento
                </Label>
                <Switch
                  id="showProtocol"
                  checked={showProtocol}
                  onCheckedChange={setShowProtocol}
                />
              </div>

              {showProtocol && (
                <div className="grid gap-4 rounded-lg border p-4">
                  {/* Phase 1 */}
                  <div>
                    <p className="mb-3 text-sm font-medium">Fase inicial</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="initialFrequency"
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Cada cuántas semanas
                        </Label>
                        <Input
                          id="initialFrequency"
                          type="text"
                          inputMode="numeric"
                          value={initialFrequency}
                          onChange={handleNumberChange(setInitialFrequency)}
                          placeholder="ej. 4"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="initialSessions"
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          Número de sesiones
                        </Label>
                        <Input
                          id="initialSessions"
                          type="text"
                          inputMode="numeric"
                          value={initialSessions}
                          onChange={handleNumberChange(setInitialSessions)}
                          placeholder="ej. 3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 — only shown when Phase 1 has values */}
                  {(initialFrequency || initialSessions) && (
                    <div className="border-t pt-4">
                      <p className="mb-1 text-sm font-medium">Mantenimiento</p>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Se activa luego de completar las sesiones iniciales
                      </p>
                      <div className="space-y-2">
                        <Label
                          htmlFor="maintenanceFrequency"
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Cada cuántas semanas después
                        </Label>
                        <Input
                          id="maintenanceFrequency"
                          type="text"
                          inputMode="numeric"
                          value={maintenanceFrequency}
                          onChange={handleNumberChange(setMaintenanceFrequency)}
                          placeholder="ej. 12"
                        />
                      </div>
                    </div>
                  )}

                  {/* Live summary */}
                  {(initialFrequency ||
                    initialSessions ||
                    maintenanceFrequency) && (
                    <div className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Protocolo:{' '}
                        {initialSessions
                          ? `${initialSessions} sesión${parseInt(initialSessions, 10) !== 1 ? 'es' : ''}`
                          : '—'}{' '}
                        {initialFrequency
                          ? `cada ${initialFrequency} semana${parseInt(initialFrequency, 10) !== 1 ? 's' : ''}`
                          : ''}
                        {maintenanceFrequency
                          ? ` → luego cada ${maintenanceFrequency} semana${parseInt(maintenanceFrequency, 10) !== 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="protocolNotes">Notas del protocolo</Label>
                    <Textarea
                      id="protocolNotes"
                      value={protocolNotes}
                      onChange={(e) => setProtocolNotes(e.target.value)}
                      placeholder="Instrucciones especiales para el paciente..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Guardando...' : treatment ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
