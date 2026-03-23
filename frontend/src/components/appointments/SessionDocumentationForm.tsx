import { useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { statusConfig } from './constants';
import type { Appointment } from '@/types';

interface SessionDocumentationFormProps {
  appointmentId: string;
  patientId: string;
  sessionId: string | null;
  initialProcedures?: string;
  initialRecommendations?: string;
  onSessionCreated: (sessionId: string) => void;
  onStatusChange: (status: Appointment['status']) => void;
  currentStatus: Appointment['status'];
}

export function SessionDocumentationForm({
  appointmentId,
  patientId,
  sessionId,
  initialProcedures = '',
  initialRecommendations = '',
  onSessionCreated,
  onStatusChange,
  currentStatus,
}: SessionDocumentationFormProps) {
  const [procedures, setProcedures] = useState(initialProcedures);
  const [recommendations, setRecommendations] = useState(
    initialRecommendations
  );
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const currentSessionId = useRef<string | null>(sessionId);

  // Keep ref updated when sessionId prop changes
  if (sessionId && !currentSessionId.current) {
    currentSessionId.current = sessionId;
  }

  const handleSave = useCallback(async () => {
    if (!procedures.trim()) {
      toast.error('Los procedimientos son requeridos');
      return;
    }
    setSaving(true);
    try {
      if (!currentSessionId.current) {
        // Create new session
        const { data } = await api.post<{ id: string }>('/sessions', {
          appointment_id: appointmentId,
          patient_id: patientId,
          procedures_performed: procedures,
          recommendations: recommendations || null,
        });
        currentSessionId.current = data.id;
        onSessionCreated(data.id);
        toast.success('Sesión guardada');
      } else {
        // Update existing session
        await api.put(`/sessions/${currentSessionId.current}`, {
          procedures_performed: procedures,
          recommendations: recommendations || null,
        });
        toast.success('Sesión actualizada');
      }
    } catch {
      toast.error('No se pudo guardar la sesión');
    } finally {
      setSaving(false);
    }
  }, [procedures, recommendations, appointmentId, patientId, onSessionCreated]);

  const handleBlur = useCallback(async () => {
    if (!procedures.trim()) return;
    // Auto-save on blur (only if content changed from initial)
    if (
      procedures === initialProcedures &&
      recommendations === initialRecommendations
    )
      return;
    await handleSave();
  }, [
    procedures,
    recommendations,
    initialProcedures,
    initialRecommendations,
    handleSave,
  ]);

  const handleStatusUpdate = async (newStatus: Appointment['status']) => {
    setUpdatingStatus(true);
    try {
      const { data } = await api.put<Appointment>(
        `/appointments/${appointmentId}`,
        { status: newStatus }
      );
      onStatusChange(data.status);
      toast.success('Estado actualizado');
    } catch {
      toast.error('No se pudo actualizar el estado');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusCfg = statusConfig[currentStatus];

  return (
    <div className="space-y-4">
      {/* Session documentation */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Documentación de la sesión
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="procedures" className="text-sm font-medium">
            Procedimientos realizados{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="procedures"
            value={procedures}
            onChange={(e) => setProcedures(e.target.value)}
            onBlur={handleBlur}
            placeholder="Describe los procedimientos realizados durante la sesión..."
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recommendations" className="text-sm font-medium">
            Recomendaciones
          </Label>
          <Textarea
            id="recommendations"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            onBlur={handleBlur}
            placeholder="Recomendaciones para el paciente..."
            className="min-h-[80px] resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !procedures.trim()}
          className="w-full"
          size="sm"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar sesión'}
        </Button>
      </div>

      {/* Status controls */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Estado del turno
          </span>
          <Badge
            variant="outline"
            className={cn('gap-1.5', statusCfg?.className)}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', statusCfg?.dotColor)}
            />
            {statusCfg?.label}
          </Badge>
        </div>

        {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
          <p className="text-xs text-muted-foreground">
            Documenta los procedimientos antes de marcar como completado.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {currentStatus === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              disabled={updatingStatus}
              onClick={() => handleStatusUpdate('confirmed')}
              className="flex-1"
            >
              {updatingStatus && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Confirmar
            </Button>
          )}

          {(currentStatus === 'pending' || currentStatus === 'confirmed') && (
            <Button
              variant="outline"
              size="sm"
              disabled={updatingStatus || !procedures.trim()}
              onClick={() => handleStatusUpdate('completed')}
              className="flex-1"
            >
              {updatingStatus && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Marcar como completado
            </Button>
          )}

          {currentStatus !== 'cancelled' && currentStatus !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              disabled={updatingStatus}
              onClick={() => handleStatusUpdate('cancelled')}
              className="flex-1 text-destructive hover:text-destructive"
            >
              {updatingStatus && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
