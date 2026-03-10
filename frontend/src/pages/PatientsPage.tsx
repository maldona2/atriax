import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { usePatients } from '@/hooks/usePatients';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import api from '@/lib/api';
import type { Patient } from '@/types';
import type { PatientFormData } from '@/hooks/usePatients';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

const columnHelper = createColumnHelper<Patient>();

const filterFields: { label: string; value: string; placeholder: string }[] = [
  {
    label: 'Nombre',
    value: 'name',
    placeholder: 'Buscar por nombre...',
  },
];

export function PatientsPage() {
  const { patients, loading, refetch } = usePatients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const openCreate = useCallback(() => {
    setEditingPatient(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((patient: Patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.last_name}, ${row.first_name}`,
        {
          id: 'name',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nombre" />
          ),
          cell: ({ row }) => (
            <Link
              to={`/app/patients/${row.original.id}`}
              className="font-medium text-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
            >
              {row.original.last_name}, {row.original.first_name}
            </Link>
          ),
          filterFn: 'includesString',
        }
      ),
      columnHelper.accessor('phone', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Teléfono" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('email', {
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(row.original)}
            className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            <Pencil className="size-4" />
            <span className="sr-only">Editar</span>
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  async function handleSubmit(data: PatientFormData) {
    const payload = {
      ...data,
      phone: data.phone || null,
      email: data.email || null,
      date_of_birth: data.date_of_birth || null,
      notes: data.notes || null,
    };
    if (editingPatient) {
      await api.put(`/patients/${editingPatient.id}`, payload);
      toast.success('Paciente actualizado');
    } else {
      await api.post('/patients', payload);
      toast.success('Paciente creado');
    }
    setEditingPatient(null);
    refetch();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona la información de tus pacientes
            </p>
          </div>
          <Button disabled className="w-full sm:w-auto">
            <Plus className="size-4" />
            Nuevo paciente
          </Button>
        </div>
        <DataTableSkeleton
          columnCount={4}
          searchableColumnCount={1}
          filterableColumnCount={0}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona la información de tus pacientes
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Nuevo paciente
        </Button>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table} filterFields={filterFields}>
          {patients.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {patients.length}{' '}
              {patients.length === 1 ? 'paciente' : 'pacientes'}
            </span>
          )}
        </DataTableToolbar>
      </DataTable>

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
