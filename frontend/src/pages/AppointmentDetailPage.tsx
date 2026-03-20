import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAppointment } from '@/hooks/useAppointments';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { SessionPhotoGallery } from '@/components/sessions/SessionPhotoGallery';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { detail, loading, refetch } = useAppointment(id);
  const [procedures, setProcedures] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!detail) {
    return (
      <div>
        <p className="text-muted-foreground">Turno no encontrado.</p>
        <Button variant="link" asChild>
          <Link to="/app/appointments">Volver a turnos</Link>
        </Button>
      </div>
    );
  }

  async function changeStatus(status: string) {
    if (!detail) return;
    try {
      await api.put(`/appointments/${detail.id}`, { status });
      toast.success('Estado actualizado, recarga para ver cambios');
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  }

  async function saveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !detail) return;
    if (!procedures.trim()) {
      toast.error('Completa los procedimientos realizados');
      return;
    }
    setSavingSession(true);
    try {
      await api.post('/sessions', {
        appointment_id: detail.id,
        patient_id: detail.patient_id,
        procedures_performed: procedures,
        recommendations: recommendations || null,
      });
      toast.success('Sesión guardada.');
      refetch();
    } catch {
      toast.error('No se pudo guardar la sesión');
    } finally {
      setSavingSession(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/app/appointments">← Turnos</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {detail.patient_last_name && detail.patient_first_name
              ? `${detail.patient_last_name}, ${detail.patient_first_name}`
              : 'Paciente'}
          </CardTitle>
          <CardDescription>
            {new Date(detail.scheduled_at).toLocaleString('es-AR', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Estado:</span>
            <Badge>{statusLabels[detail.status] ?? detail.status}</Badge>
          </div>

          <div className="space-x-2">
            {detail.status !== 'pending' && (
              <Button variant="outline" size="sm" onClick={() => changeStatus('pending')}>
                Marcar pendiente
              </Button>
            )}
            {detail.status !== 'confirmed' && (
              <Button variant="outline" size="sm" onClick={() => changeStatus('confirmed')}>
                Confirmar
              </Button>
            )}
            {detail.status !== 'completed' && (
              <Button variant="outline" size="sm" onClick={() => changeStatus('completed')}>
                Completar
              </Button>
            )}
            {detail.status !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={() => changeStatus('cancelled')}>
                Cancelar
              </Button>
            )}
          </div>

          {detail.notes && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm mb-1">Notas:</p>
                <p className="whitespace-pre-wrap">{detail.notes}</p>
              </div>
            </>
          )}

          {(detail.procedures_performed || detail.recommendations) && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                {detail.procedures_performed && (
                  <p>
                    <span className="text-muted-foreground">Procedimientos:</span>{' '}
                    {detail.procedures_performed}
                  </p>
                )}
                {detail.recommendations && (
                  <p>
                    <span className="text-muted-foreground">Recomendaciones:</span>{' '}
                    {detail.recommendations}
                  </p>
                )}
              </div>
            </>
          )}

          {detail.session_id && (
            <>
              <Separator />
              <SessionPhotoGallery sessionId={detail.session_id} />
            </>
          )}

          {detail.status === 'completed' && !detail.procedures_performed && !detail.recommendations && (
            <>
              <Separator />
              <form onSubmit={saveSession} className="space-y-3 text-sm">
                <p className="font-medium">Registrar sesión</p>
                <div className="space-y-1">
                  <label className="text-muted-foreground" htmlFor="procedures">
                    Procedimientos realizados
                  </label>
                  <Textarea
                    id="procedures"
                    value={procedures}
                    onChange={(e) => setProcedures(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground" htmlFor="recommendations">
                    Recomendaciones / próxima visita (opcional)
                  </label>
                  <Textarea
                    id="recommendations"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button type="submit" size="sm" disabled={savingSession}>
                  {savingSession ? 'Guardando...' : 'Guardar sesión'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
