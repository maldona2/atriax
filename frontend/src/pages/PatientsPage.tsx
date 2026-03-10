import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '@/hooks/usePatients';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import type { Patient } from '@/types';
import type { PatientFormData } from '@/hooks/usePatients';
import { toast } from 'sonner';

export function PatientsPage() {
  const { patients, loading, query, setQuery, refetch } = usePatients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

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

  function openCreate() {
    setEditingPatient(null);
    setDialogOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditingPatient(patient);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <Button onClick={openCreate}>Nuevo paciente</Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    to={`/app/patients/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.last_name}, {p.first_name}
                  </Link>
                </TableCell>
                <TableCell>{p.phone ?? '—'}</TableCell>
                <TableCell>{p.email ?? '—'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(p)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {patients.length === 0 && !loading && (
        <p className="text-muted-foreground">No hay pacientes.</p>
      )}

      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
