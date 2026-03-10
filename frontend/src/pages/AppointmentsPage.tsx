import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types';
import type { AppointmentFormData } from '@/hooks/useAppointments';
import api from '@/lib/api';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const emptyForm: AppointmentFormData = {
  patient_id: '',
  date: null,
  time: '10:00',
  duration_minutes: 60,
  notes: '',
};

const columnHelper = createColumnHelper<Appointment>();

export function AppointmentsPage() {
  const { appointments, loading, date, setDate, status, setStatus, refetch } =
    useAppointments();
  const { patients } = usePatients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const columns = useMemo(
    () => [
      columnHelper.accessor('scheduled_at', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha" />
        ),
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleString('es-AR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
      }),
      columnHelper.accessor(
        (row) =>
          row.patient_last_name && row.patient_first_name
            ? `${row.patient_last_name}, ${row.patient_first_name}`
            : '—',
        {
          id: 'patient',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Paciente" />
          ),
        }
      ),
      columnHelper.accessor('status', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ getValue }) => (
          <Badge variant="secondary">
            {statusLabels[getValue()] ?? getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('notes', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Notas" />
        ),
        cell: ({ getValue }) => (
          <span className="max-w-xs truncate block">{getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link to={`/app/appointments/${row.original.id}`}>Ver</Link>
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: appointments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openCreate() {
    setForm({
      ...emptyForm,
      date: date ?? new Date(),
    });
    setOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
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

      await api.post('/appointments', {
        patient_id: form.patient_id,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: form.duration_minutes,
        notes: form.notes || null,
      });
      toast.success('Turno creado');
      setOpen(false);
      setForm(emptyForm);
      refetch();
    } catch {
      toast.error('Error al crear turno');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Turnos</h1>
          <Button disabled>Nuevo turno</Button>
        </div>
        <DataTableSkeleton
          columnCount={5}
          searchableColumnCount={0}
          filterableColumnCount={0}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Turnos</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button onClick={openCreate}>Nuevo turno</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nuevo turno</SheetTitle>
            </SheetHeader>
            <form
              onSubmit={handleCreate}
              className="flex flex-1 flex-col gap-4 p-4"
            >
              <div className="space-y-2">
                <span className="text-sm font-medium">Paciente</span>
                <Select
                  value={form.patient_id}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, patient_id: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.last_name}, {p.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Fecha</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.date && 'text-muted-foreground'
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date
                        ? form.date.toLocaleDateString('es-AR')
                        : 'Elegir fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-2" align="start">
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
                <div className="space-y-2">
                  <span className="text-sm font-medium">Hora</span>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Duración (min)</span>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        duration_minutes: Number(e.target.value) || 60,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Notas</span>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <SheetFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Crear turno'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table} filterFields={[]}>
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[220px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? date.toLocaleDateString('es-AR')
                    : 'Filtrar por fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2" align="start">
                <Calendar
                  required
                  mode="single"
                  selected={date ?? undefined}
                  onSelect={setDate}
                />
              </PopoverContent>
            </Popover>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger className="w-[180px]">
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
            {appointments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay turnos para los filtros.
              </p>
            )}
          </div>
        </DataTableToolbar>
      </DataTable>
    </div>
  );
}
