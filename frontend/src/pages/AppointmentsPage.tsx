import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  isSameWeek,
  parseISO,
} from 'date-fns';
import { LayoutList, CalendarDays } from 'lucide-react';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { useTreatments } from '@/hooks/useTreatments';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Appointment, Patient } from '@/types';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import {
  emptyForm,
  NewAppointmentSheet,
  AppointmentListView,
  AppointmentDetailPanel,
  AppointmentDetailSheet,
  AppointmentsSidebar,
  AppointmentsWeekGrid,
  CalendarSkeleton,
} from '@/components/appointments';

type ViewMode = 'list' | 'calendar';

export function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // ── List-view state ──────────────────────────────────────────────────────
  const defaultDateFrom = startOfMonth(new Date());
  const defaultDateTo = endOfMonth(addMonths(new Date(), 3));
  const [dateFrom, setDateFrom] = useState<Date | null>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<Date | null>(defaultDateTo);
  const [statusFilter, setStatusFilter] = useState<
    Appointment['status'] | 'all'
  >('all');

  // ── Calendar-view state ──────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<
    Appointment['status'] | 'all'
  >('all');

  // ── Shared state ─────────────────────────────────────────────────────────
  const { appointments, loading, refetch } = useAppointments(
    viewMode === 'list'
      ? { dateFrom, dateTo, status: statusFilter }
      : { status: calendarStatus }
  );
  const { patients, refetch: refetchPatients } = usePatients();
  const { treatments } = useTreatments();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ── Calendar-view filtered appointments ──────────────────────────────────
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const calendarAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (calendarStatus !== 'all' && apt.status !== calendarStatus)
        return false;
      const aptDate = parseISO(apt.scheduled_at);
      return isSameWeek(aptDate, currentDate, { weekStartsOn: 1 });
    });
  }, [appointments, calendarStatus, currentDate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openNewAppointment = (date?: Date) => {
    setSelectedAppointment(null);
    setForm({ ...emptyForm, date: date ?? new Date() });
    setSheetOpen(true);
  };

  const handleSelectAppointment = (apt: Appointment) => {
    setSelectedAppointmentId(apt.id);
    // Only open the mobile sheet on small screens
    if (window.innerWidth < 768) {
      setMobileDetailOpen(true);
    }
  };

  const handleCalendarAppointmentClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
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
        payment_status: form.payment_status ?? 'unpaid',
        treatments:
          form.treatments && form.treatments.length > 0
            ? form.treatments
            : undefined,
      };

      if (selectedAppointment) {
        await api.put(`/appointments/${selectedAppointment.id}`, payload);
        toast.success('Turno actualizado');
        setSheetOpen(false);
        setForm(emptyForm);
        refetch();
      } else {
        const { data: newApt } = await api.post<Appointment>(
          '/appointments',
          payload
        );

        // If session notes were filled in, create a session for the new appointment
        if (form.session_procedures?.trim()) {
          await api.post('/sessions', {
            appointment_id: newApt.id,
            patient_id: form.patient_id,
            procedures_performed: form.session_procedures,
            recommendations: form.session_recommendations?.trim() || null,
          });
        }

        toast.success('Turno creado');
        setSheetOpen(false);
        setForm(emptyForm);
        refetch();
        // Auto-select in list view
        if (viewMode === 'list') {
          setSelectedAppointmentId(newApt.id);
          if (window.innerWidth < 768) {
            setMobileDetailOpen(true);
          }
        }
      }
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

  const handlePatientCreated = (patient: Patient) => {
    refetchPatients();
    setForm((f) => ({ ...f, patient_id: patient.id }));
    toast.success(`Paciente ${patient.first_name} ${patient.last_name} creado`);
  };

  // ── View toggle ───────────────────────────────────────────────────────────
  const viewToggle = (
    <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
      <Button
        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 px-1.5 text-xs sm:px-2.5"
        onClick={() => setViewMode('list')}
      >
        <LayoutList className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden xs:inline sm:inline">Lista</span>
      </Button>
      <Button
        variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 gap-1.5 px-1.5 text-xs sm:px-2.5"
        onClick={() => setViewMode('calendar')}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden xs:inline sm:inline">Calendario</span>
      </Button>
    </div>
  );

  // ── Calendar view ─────────────────────────────────────────────────────────
  if (viewMode === 'calendar') {
    if (loading) return <CalendarSkeleton />;
    return (
      <div className="-m-4 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background sm:-m-5 md:-m-6">
        <header className="flex shrink-0 flex-col gap-2 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 md:px-6 md:py-4">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Turnos
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {viewToggle}
            <ContextualHelpButton section="appointments" />
            <Button
              size="sm"
              className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
              onClick={() => openNewAppointment()}
            >
              <span className="hidden sm:inline">Nuevo turno</span>
              <span className="sm:hidden">Nuevo</span>
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
            filteredAppointments={calendarAppointments}
            onPreviousWeek={() => setCurrentDate(subWeeks(currentDate, 1))}
            onNextWeek={() => setCurrentDate(addWeeks(currentDate, 1))}
            onToday={() => setCurrentDate(new Date())}
            onNewAppointment={openNewAppointment}
            onAppointmentClick={handleCalendarAppointmentClick}
          />
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md md:max-w-lg">
            {selectedAppointment ? (
              <AppointmentDetailSheet
                appointment={selectedAppointment}
                onClose={() => setSheetOpen(false)}
                onStatusChange={(updated) => {
                  setSelectedAppointment(updated);
                  refetch({ silent: true });
                }}
                onDelete={() => {
                  setSheetOpen(false);
                  refetch({ silent: true });
                }}
              />
            ) : (
              <NewAppointmentSheet
                form={form}
                setForm={setForm}
                patients={patients}
                treatments={treatments}
                submitting={submitting}
                onSubmit={handleSubmit}
                onPatientCreated={handlePatientCreated}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-background sm:-m-5 md:-m-6">
      {/* Left panel */}
      <div
        className={`flex h-full flex-col ${mobileDetailOpen ? 'hidden md:flex' : 'flex'} w-full min-w-0 border-r md:w-[45%] lg:w-[40%] xl:w-[35%] md:min-w-[320px] lg:min-w-[360px] xl:min-w-[400px] md:max-w-[500px] lg:max-w-[520px] xl:max-w-[560px]`}
      >
        <AppointmentListView
          appointments={appointments}
          loading={loading}
          selectedId={selectedAppointmentId}
          onSelect={handleSelectAppointment}
          onNew={() => openNewAppointment()}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          viewToggle={viewToggle}
        />
      </div>

      {/* Right panel: desktop */}
      <div className="hidden h-full min-w-0 flex-1 overflow-hidden md:flex md:flex-col">
        <AppointmentDetailPanel appointmentId={selectedAppointmentId} />
      </div>

      {/* Right panel: mobile full-screen (no backdrop) */}
      {mobileDetailOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <AppointmentDetailPanel
            appointmentId={selectedAppointmentId}
            onClose={() => setMobileDetailOpen(false)}
          />
        </div>
      )}

      {/* New appointment sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md md:max-w-lg">
          <NewAppointmentSheet
            form={form}
            setForm={setForm}
            patients={patients}
            treatments={treatments}
            submitting={submitting}
            onSubmit={handleSubmit}
            onPatientCreated={handlePatientCreated}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
