import { useCallback, useMemo, useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import {
  PatientFormDialog,
  PatientActionsMenu,
  PatientCard,
  PatientDetailPanel,
} from '@/components/patients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import api from '@/lib/api';
import type { Patient, PatientDetail } from '@/types';
import type { PatientFormData } from '@/hooks/usePatients';
import { toast } from 'sonner';
import { Plus, Search, Users } from 'lucide-react';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';

export function PatientsPage() {
  const { patients, loading, refetch } = usePatients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const openCreate = useCallback(() => {
    setEditingPatient(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((patient: Patient) => {
    setEditingPatient(patient);
    setDialogOpen(true);
  }, []);

  const handleSelectPatient = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
    if (window.innerWidth < 768) {
      setMobileDetailOpen(true);
    }
  }, []);

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

  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] min-h-0 overflow-hidden bg-background sm:-m-5 md:-m-6">
      {/* Left panel */}
      <div
        className={`flex h-full flex-col ${mobileDetailOpen ? 'hidden md:flex' : 'flex'} w-full min-w-0 border-r md:w-[45%] lg:w-[40%] xl:w-[35%] md:min-w-[300px] lg:min-w-[340px] xl:min-w-[380px] md:max-w-[480px] lg:max-w-[500px] xl:max-w-[540px]`}
      >
        {/* Header */}
        <div className="shrink-0 border-b px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Pacientes
              </h2>
              {!loading && (
                <Badge variant="secondary" className="tabular-nums">
                  {patients.length}
                </Badge>
              )}
              <ContextualHelpButton section="patients" />
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-30" />
                <p className="font-medium">
                  {search ? 'Sin resultados' : 'Sin pacientes'}
                </p>
                <p className="mt-1 text-sm">
                  {search
                    ? 'No hay pacientes que coincidan con la búsqueda.'
                    : 'Crea el primer paciente con el botón Nuevo.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="group relative flex items-center gap-1"
                  >
                    <PatientCard
                      patient={p as PatientDetail}
                      isSelected={selectedPatientId === p.id}
                      onClick={() => handleSelectPatient(p.id)}
                    />
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PatientActionsMenu
                        patient={p}
                        onEdit={openEdit}
                        onView={(pt) => handleSelectPatient(pt.id)}
                        refetch={refetch}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right panel: desktop */}
      <div className="hidden h-full min-w-0 flex-1 overflow-hidden md:flex md:flex-col">
        <PatientDetailPanel
          patientId={selectedPatientId}
          key={selectedPatientId}
        />
      </div>

      {/* Right panel: mobile full-screen (no backdrop) */}
      {mobileDetailOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <PatientDetailPanel
            patientId={selectedPatientId}
            onClose={() => setMobileDetailOpen(false)}
          />
        </div>
      )}

      {/* New/Edit patient dialog */}
      <PatientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={editingPatient}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
