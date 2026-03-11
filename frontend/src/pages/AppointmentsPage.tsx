import { useMemo, useState } from 'react';
import {
  addDays,
  addWeeks,
  format,
  isSameWeek,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Appointment } from '@/types';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import {
  emptyForm,
  AppointmentDetailSheet,
  NewAppointmentSheet,
  CalendarSkeleton,
  AppointmentsSidebar,
  AppointmentsWeekGrid,
} from '@/components/appointments';

export function AppointmentsPage() {
  const {
    appointments,
    loading,
    status,
    setStatus: setStatusFilter,
    refetch,
  } = useAppointments();
  const { patients } = usePatients();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (status !== 'all' && apt.status !== status) return false;
      const aptDate = parseISO(apt.scheduled_at);
      return isSameWeek(aptDate, currentDate, { weekStartsOn: 1 });
    });
  }, [appointments, status, currentDate]);

  const openNewAppointment = (date?: Date) => {
    setSelectedAppointment(null);
    setForm({
      ...emptyForm,
      date: date ?? new Date(),
    });
    setSheetOpen(true);
  };

  const openAppointmentDetails = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setForm({
      patient_id: apt.patient_id,
      date: parseISO(apt.scheduled_at),
      time: format(parseISO(apt.scheduled_at), 'HH:mm'),
      duration_minutes: apt.duration_minutes,
      notes: apt.notes || '',
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.patient_id) {
      toast.error('Selecciona paciente y fecha');
      return;
    }
    setSubmitting(true);
    try {
      const [hours, minutes] = form.time.split(':').map(Number);
      const scheduled = new Date(form.date);
      scheduled.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      const payload = {
        patient_id: form.patient_id,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: form.duration_minutes,
        notes: form.notes || null,
      };

      if (selectedAppointment) {
        await api.put(`/appointments/${selectedAppointment.id}`, payload);
        toast.success('Turno actualizado');
      } else {
        await api.post('/appointments', payload);
        toast.success('Turno creado');
      }
      setSheetOpen(false);
      setForm(emptyForm);
      refetch();
    } catch {
      toast.error(
        selectedAppointment
          ? 'Error al actualizar turno'
          : 'Error al crear turno'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden bg-background md:-m-6">
      <header className="flex shrink-0 flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Turnos</h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {filteredAppointments.length} esta semana
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => setStatusFilter(v as typeof status)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => openNewAppointment()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo turno
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AppointmentsSidebar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onDateChange={setCurrentDate}
        />

        <AppointmentsWeekGrid
          currentDate={currentDate}
          weekDays={weekDays}
          filteredAppointments={filteredAppointments}
          onPreviousWeek={() => setCurrentDate(subWeeks(currentDate, 1))}
          onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
          onToday={() => setCurrentDate(new Date())}
          onNewAppointment={openNewAppointment}
          onAppointmentClick={openAppointmentDetails}
        />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
          {selectedAppointment ? (
            <AppointmentDetailSheet
              appointment={selectedAppointment}
              onClose={() => setSheetOpen(false)}
              onStatusChange={(updated) => {
                setSelectedAppointment(updated);
                refetch({ silent: true });
              }}
            />
          ) : (
            <NewAppointmentSheet
              form={form}
              setForm={setForm}
              patients={patients}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
