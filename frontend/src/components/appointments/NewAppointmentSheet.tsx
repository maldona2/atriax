import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, FileText, Plus, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { AppointmentFormData } from '@/hooks/useAppointments';
import type { Patient } from '@/types';

interface NewAppointmentSheetProps {
  form: AppointmentFormData;
  setForm: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  patients: Patient[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function NewAppointmentSheet({
  form,
  setForm,
  patients,
  submitting,
  onSubmit,
}: NewAppointmentSheetProps) {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b bg-primary/5 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-xl">Nuevo turno</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Completa los datos para agendar
            </p>
          </div>
        </div>
      </SheetHeader>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <div className="space-y-2.5">
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
                <SelectTrigger className="h-12 rounded-lg">
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
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Fecha
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-12 w-full justify-start rounded-lg text-left font-normal',
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
                    onSelect={(d) =>
                      setForm((f) => ({ ...f, date: d ?? null }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  Hora
                </label>
                <Input
                  type="time"
                  className="h-12 rounded-lg"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-sm font-medium">Duración</label>
                <Select
                  value={form.duration_minutes.toString()}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, duration_minutes: Number(value) }))
                  }
                >
                  <SelectTrigger className="h-12 rounded-lg">
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

            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Notas{' '}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </label>
              <Input
                className="h-12 rounded-lg"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Motivo de la consulta, observaciones..."
              />
            </div>
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/30 p-4">
          <Button
            type="submit"
            className="h-12 w-full rounded-lg text-base font-medium"
            disabled={submitting || !form.patient_id || !form.date}
          >
            {submitting ? 'Creando...' : 'Crear turno'}
          </Button>
        </div>
      </form>
    </div>
  );
}
