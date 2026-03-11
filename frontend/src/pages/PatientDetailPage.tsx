import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePatient } from '@/hooks/usePatients';
import { useTreatments } from '@/hooks/useTreatments';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { emptyForm, NewAppointmentSheet } from '@/components/appointments';
import type { PatientFormData } from '@/hooks/usePatients';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import {
  Pencil,
  Plus,
  CalendarDays,
  ChevronRight,
  ArrowLeft,
  Phone,
  Mail,
  Cake,
  FileText,
  Clock,
  User,
} from 'lucide-react';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  pending: { label: 'Pendiente', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { detail, loading, refetch } = usePatient(id);
  const { treatments } = useTreatments();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [appointmentSheetOpen, setAppointmentSheetOpen] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const openNewAppointment = () => {
    setForm({
      ...emptyForm,
      patient_id: id ?? '',
      date: new Date(),
    });
    setAppointmentSheetOpen(true);
  };

  const handleEditSubmit = async (data: PatientFormData) => {
    if (!id) return;
    const payload = {
      ...data,
      phone: data.phone || null,
      email: data.email || null,
      date_of_birth: data.date_of_birth || null,
      notes: data.notes || null,
    };
    await api.put(`/patients/${id}`, payload);
    toast.success('Paciente actualizado');
    setEditDialogOpen(false);
    refetch();
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.patient_id) {
      toast.error('Selecciona fecha y hora');
      return;
    }
    setSubmitting(true);
    try {
      const [hours, minutes] = form.time.split(':').map(Number);
      const scheduled = new Date(form.date);
      scheduled.setHours(hours ?? 0, minutes ?? 0, 0, 0);

      await api.post('/appointments', {
        patient_id: form.patient_id,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: form.duration_minutes,
        notes: form.notes || null,
        payment_status: form.payment_status ?? 'unpaid',
        treatments:
          form.treatments && form.treatments.length > 0
            ? form.treatments
            : undefined,
      });
      toast.success('Turno creado');
      setAppointmentSheetOpen(false);
      setForm(emptyForm);
      refetch();
    } catch {
      toast.error('Error al crear turno');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando paciente...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="font-medium">Paciente no encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            El paciente que buscas no existe o fue eliminado
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/app/patients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a pacientes
          </Link>
        </Button>
      </div>
    );
  }

  const { patient, appointments } = detail;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" asChild>
            <Link to="/app/patients">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
              {getInitials(patient.first_name, patient.last_name)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Ficha del paciente
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button size="sm" onClick={openNewAppointment} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="ficha" className="space-y-6 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="ficha" className="gap-2">
            <User className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Historial
            {appointments.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs"
              >
                {appointments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="mt-6 space-y-6">
          {/* Contact Information */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardHeader className="border-b bg-muted/30 px-6 py-4">
              <CardTitle className="text-base font-medium">
                Información de contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 p-0">
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Teléfono"
                value={patient.phone}
              />
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={patient.email}
              />
              <InfoRow
                icon={<Cake className="h-4 w-4" />}
                label="Fecha de nacimiento"
                value={
                  patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString(
                        'es-AR',
                        {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }
                      )
                    : null
                }
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {patient.notes && (
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardHeader className="border-b bg-muted/30 px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {patient.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          {appointments.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <CalendarDays className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-medium">Sin historial de citas</h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Este paciente aún no tiene turnos registrados
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNewAppointment}
                  className="mt-6 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear primera cita
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const config = statusConfig[a.status] ?? {
                  label: a.status,
                  variant: 'secondary' as const,
                };
                return (
                  <Link
                    key={a.id}
                    to={`/app/appointments/${a.id}`}
                    className="group block"
                  >
                    <Card className="border-0 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-foreground">
                              {formatDate(a.scheduled_at)}
                            </p>
                            <Badge
                              variant={config.variant}
                              className="shrink-0"
                            >
                              {config.label}
                            </Badge>
                          </div>
                          {(a.procedures_performed || a.recommendations) && (
                            <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                              {a.procedures_performed && (
                                <p className="line-clamp-1">
                                  {a.procedures_performed}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PatientFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        patient={patient}
        onSubmit={handleEditSubmit}
      />

      <Sheet open={appointmentSheetOpen} onOpenChange={setAppointmentSheetOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
          <NewAppointmentSheet
            form={form}
            setForm={setForm}
            patients={[patient]}
            treatments={treatments}
            submitting={submitting}
            onSubmit={handleAppointmentSubmit}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm text-foreground">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}
