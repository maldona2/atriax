import { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Treatment, PatientTreatment } from '@/types';

interface PatientTreatmentsCardProps {
  treatments: Treatment[];
  patientTreatments: PatientTreatment[];
  loading: boolean;
  onAssignTreatment: (treatmentId: string) => Promise<void>;
  onCompleteSession: (id: string) => Promise<void>;
  onReactivateTreatment: (id: string) => Promise<void>;
  onRemoveTreatment: (id: string) => Promise<void>;
  calculateNextAppointment: (patientTreatment: PatientTreatment) => Date | null;
}

function formatDate(date: Date | null): string {
  if (!date) return 'No disponible';
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPhaseInfo(patientTreatment: PatientTreatment): {
  phase: string;
  sessionsInfo: string;
} {
  const treatment = patientTreatment.treatment;
  if (!treatment) return { phase: 'Desconocido', sessionsInfo: '' };

  const currentSession = patientTreatment.current_session;
  const initialSessions = treatment.initial_sessions_count ?? 0;
  const hasInitialPhase =
    initialSessions > 0 && treatment.initial_frequency_weeks !== null;
  const hasMaintenancePhase = treatment.maintenance_frequency_weeks !== null;

  if (hasInitialPhase && currentSession <= initialSessions) {
    const remaining = initialSessions - currentSession + 1;
    return {
      phase: 'Inicial',
      sessionsInfo: `Sesión ${currentSession} de ${initialSessions} (${remaining} restantes)`,
    };
  } else if (hasMaintenancePhase) {
    return {
      phase: 'Mantenimiento',
      sessionsInfo: `Sesión ${currentSession} - Seguimiento ${currentSession - initialSessions}`,
    };
  }

  return { phase: 'Activo', sessionsInfo: `Sesión ${currentSession}` };
}

export function PatientTreatmentsCard({
  treatments,
  patientTreatments,
  loading,
  onAssignTreatment,
  onCompleteSession,
  onReactivateTreatment,
  onRemoveTreatment,
  calculateNextAppointment,
}: PatientTreatmentsCardProps) {
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeTreatments = patientTreatments.filter((pt) => pt.is_active);
  const completedTreatments = patientTreatments.filter((pt) => !pt.is_active);

  const availableTreatments = treatments.filter(
    (t) =>
      !patientTreatments.some((pt) => pt.treatment_id === t.id && pt.is_active)
  );

  async function handleAssign() {
    if (!selectedTreatment) return;
    setAssigning(true);
    try {
      await onAssignTreatment(selectedTreatment);
      setSelectedTreatment('');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="border-b px-6 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          Tratamientos del paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : activeTreatments.length === 0 &&
          availableTreatments.length === 0 &&
          completedTreatments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay tratamientos disponibles
          </p>
        ) : (
          <div className="space-y-4">
            {activeTreatments.length > 0 && (
              <div className="space-y-3">
                {activeTreatments.map((pt) => {
                  const nextDate = calculateNextAppointment(pt);
                  const { phase, sessionsInfo } = getPhaseInfo(pt);
                  const treatment = pt.treatment;

                  return (
                    <div
                      key={pt.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {treatment?.name ?? 'Tratamiento'}
                          </p>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {phase}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sessionsInfo}
                        </p>
                        {nextDate && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Próxima sesión: {formatDate(nextDate)}</span>
                          </div>
                        )}
                        {treatment?.protocol_notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">
                            {treatment.protocol_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCompleteSession(pt.id)}
                        >
                          Completar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onRemoveTreatment(pt.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {availableTreatments.length > 0 && (
              <div className="flex gap-2">
                <Select
                  value={selectedTreatment}
                  onValueChange={setSelectedTreatment}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Agregar tratamiento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTreatments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedTreatment || assigning}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {completedTreatments.length > 0 && (
              <div className="border-t pt-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setHistoryOpen((prev) => !prev)}
                >
                  <span>
                    Historial de tratamientos ({completedTreatments.length})
                  </span>
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {historyOpen && (
                  <div className="mt-3 space-y-2">
                    {completedTreatments.map((pt) => (
                      <div
                        key={pt.id}
                        className="rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            {pt.treatment?.name ?? 'Tratamiento'}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Completado
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onReactivateTreatment(pt.id)}
                              title="Reactivar tratamiento"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pt.current_session - 1} sesiones completadas
                        </p>
                        {pt.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Finalizado:{' '}
                            {new Date(pt.completed_at).toLocaleDateString(
                              'es-ES',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
