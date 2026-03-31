import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon,
  Clock,
  FileText,
  Plus,
  User,
  Syringe,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { QuickAddPatientDialog } from './QuickAddPatientDialog';
import { MedicalHistorySection } from './MedicalHistorySection';
import { SuggestedDateIndicator } from './SuggestedDateIndicator';
import { useSuggestedAppointmentDate } from '@/hooks/useSuggestedAppointmentDate';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import type { Patient, Treatment } from '@/types';

interface NewAppointmentSheetProps {
  form: AppointmentFormData;
  setForm: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  patients: Patient[];
  treatments: Treatment[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPatientCreated: (patient: Patient) => void;
}

export function NewAppointmentSheet({
  form,
  setForm,
  patients,
  treatments,
  submitting,
  onSubmit,
  onPatientCreated,
}: NewAppointmentSheetProps) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [sessionNotesExpanded, setSessionNotesExpanded] = useState(false);
  const [isDateModified, setIsDateModified] = useState(false);
  const prevPatientId = useRef<string>('');

  const { suggestedDate, calculationDetails } = useSuggestedAppointmentDate(
    form.patient_id || null
  );

  // Reset modification flag when patient changes
  useEffect(() => {
    if (form.patient_id !== prevPatientId.current) {
      prevPatientId.current = form.patient_id;
      setIsDateModified(false);
    }
  }, [form.patient_id]);

  // Auto-populate date when suggestion is calculated and user hasn't modified it
  useEffect(() => {
    if (suggestedDate && !isDateModified) {
      setForm((f) => ({ ...f, date: suggestedDate }));
    }
  }, [suggestedDate, isDateModified, setForm]);

  const lineItems = form.treatments ?? [];
  const totalCents = lineItems.reduce(
    (sum, t) => sum + t.quantity * t.unit_price_cents,
    0
  );

  const addTreatment = (t: Treatment) => {
    const existing = lineItems.find((i) => i.treatment_id === t.id);
    if (existing) {
      setForm((f) => ({
        ...f,
        treatments: (f.treatments ?? []).map((i) =>
          i.treatment_id === t.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }));
    } else {
      setForm((f) => ({
        ...f,
        treatments: [
          ...(f.treatments ?? []),
          {
            treatment_id: t.id,
            quantity: 1,
            unit_price_cents: t.price_cents,
          },
        ],
      }));
    }
  };

  const removeLineItem = (treatmentId: string) => {
    setForm((f) => ({
      ...f,
      treatments: (f.treatments ?? []).filter(
        (i) => i.treatment_id !== treatmentId
      ),
    }));
  };

  const updateQuantity = (treatmentId: string, quantity: number) => {
    if (quantity < 1) return;
    setForm((f) => ({
      ...f,
      treatments: (f.treatments ?? []).map((i) =>
        i.treatment_id === treatmentId ? { ...i, quantity } : i
      ),
    }));
  };

  return (
    <div className="flex h-full max-h-[100dvh] flex-col overflow-hidden">
      {/* Header - compact on small screens */}
      <SheetHeader className="shrink-0 border-b bg-primary/5 px-4 py-3 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/5 sm:h-12 sm:w-12 sm:ring-4">
            <Plus className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="text-lg sm:text-xl">Nuevo turno</SheetTitle>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Completa los datos para agendar
            </p>
          </div>
        </div>
      </SheetHeader>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* Scrollable content area */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            {/* Patient select */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Paciente
              </label>
              <Select
                value={form.patient_id}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, patient_id: value }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg bg-background sm:h-12">
                  <SelectValue placeholder="Selecciona un paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="py-2.5">
                      <span className="font-medium">{p.last_name}</span>,{' '}
                      {p.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <QuickAddPatientDialog onPatientCreated={onPatientCreated} />
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Fecha
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-10 w-full justify-start rounded-lg text-left font-normal sm:h-12',
                      !form.date && 'text-muted-foreground'
                    )}
                    type="button"
                  >
                    {form.date
                      ? format(form.date, "EEEE, d 'de' MMMM yyyy", {
                          locale: es,
                        })
                      : 'Elegir fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date ?? undefined}
                    onSelect={(d) => {
                      setIsDateModified(true);
                      setForm((f) => ({ ...f, date: d ?? null }));
                    }}
                  />
                </PopoverContent>
              </Popover>
              {calculationDetails && (
                <SuggestedDateIndicator
                  calculationDetails={calculationDetails}
                  isModified={isDateModified}
                />
              )}
            </div>

            {/* Time and Duration */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  Hora
                </label>
                <Input
                  type="time"
                  className="h-10 rounded-lg bg-background sm:h-12"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  Duración
                </label>
                <Select
                  value={form.duration_minutes.toString()}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, duration_minutes: Number(value) }))
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-lg bg-background sm:h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treatments */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Syringe className="h-4 w-4 text-primary" />
                Tratamientos{' '}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              {treatments.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground sm:px-4 sm:py-3">
                  Crea tratamientos en tu perfil para agregarlos aquí.
                </p>
              ) : (
                <>
                  <Select
                    onValueChange={(id) => {
                      const t = treatments.find((x) => x.id === id);
                      if (t) addTreatment(t);
                    }}
                    value=""
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg bg-background sm:h-12">
                      <SelectValue placeholder="Agregar tratamiento" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatments.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {(t.price_cents / 100).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lineItems.length > 0 && (
                    <div className="space-y-2 rounded-lg border p-2 sm:p-3">
                      {lineItems.map((item) => {
                        const t = treatments.find(
                          (x) => x.id === item.treatment_id
                        );
                        return (
                          <div
                            key={item.treatment_id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-sm font-medium">
                              {t?.name ?? '—'}
                            </span>
                            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                              <Input
                                type="number"
                                min={1}
                                className="h-7 w-12 sm:h-8 sm:w-16"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    item.treatment_id,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                              />
                              <span className="w-14 text-right text-sm tabular-nums sm:w-16">
                                {(
                                  (item.quantity * item.unit_price_cents) /
                                  100
                                ).toFixed(2)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() =>
                                  removeLineItem(item.treatment_id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>Total</span>
                        <span className="tabular-nums">
                          {(totalCents / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Notas{' '}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <Input
                className="h-10 rounded-lg bg-background sm:h-12"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Motivo de la consulta, observaciones..."
              />
            </div>

            {/* Session notes (optional) */}
            <div className="rounded-lg border overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                onClick={() => setSessionNotesExpanded((v) => !v)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Documentar sesión{' '}
                  <span className="font-normal text-muted-foreground">
                    (opcional)
                  </span>
                </span>
                {sessionNotesExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {sessionNotesExpanded && (
                <div className="space-y-3 border-t p-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Procedimientos realizados
                    </label>
                    <Textarea
                      className="min-h-[80px] resize-none rounded-lg bg-background text-sm"
                      value={form.session_procedures ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          session_procedures: e.target.value,
                        }))
                      }
                      placeholder="Describe los procedimientos realizados..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Recomendaciones
                    </label>
                    <Textarea
                      className="min-h-[60px] resize-none rounded-lg bg-background text-sm"
                      value={form.session_recommendations ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          session_recommendations: e.target.value,
                        }))
                      }
                      placeholder="Recomendaciones para el paciente..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Patient medical history */}
            {form.patient_id && (
              <>
                <Separator />
                <div className="rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => setHistoryExpanded((v) => !v)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <History className="h-4 w-4 text-primary" />
                      Historial del paciente
                    </span>
                    {historyExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {historyExpanded && (
                    <div className="border-t p-3">
                      <MedicalHistorySection
                        patientId={form.patient_id}
                        excludeSessionId={null}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer - always visible */}
        <div className="shrink-0 border-t bg-muted/30 p-3 sm:p-4">
          <Button
            type="submit"
            className="h-10 w-full rounded-lg text-sm font-medium sm:h-12 sm:text-base"
            disabled={submitting || !form.patient_id || !form.date}
          >
            {submitting ? 'Creando...' : 'Crear turno'}
          </Button>
        </div>
      </form>
    </div>
  );
}
