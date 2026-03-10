import { Link, useParams } from 'react-router-dom';
import { usePatient } from '@/hooks/usePatients';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { detail, loading } = usePatient(id);

  if (loading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!detail) {
    return (
      <div>
        <p className="text-muted-foreground">Paciente no encontrado.</p>
        <Button variant="link" asChild>
          <Link to="/app/patients">Volver a pacientes</Link>
        </Button>
      </div>
    );
  }

  const { patient, appointments } = detail;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/patients">← Pacientes</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {patient.last_name}, {patient.first_name}
          </CardTitle>
          <CardDescription>Ficha del paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ficha">
            <TabsList>
              <TabsTrigger value="ficha">Ficha</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            <TabsContent value="ficha" className="space-y-4 pt-4">
              <div className="grid gap-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Teléfono:</span>{' '}
                  {patient.phone ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  {patient.email ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Fecha de nacimiento:
                  </span>{' '}
                  {patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString(
                        'es-AR'
                      )
                    : '—'}
                </p>
                {patient.notes && (
                  <>
                    <Separator />
                    <p>
                      <span className="text-muted-foreground">Notas:</span>
                    </p>
                    <p className="whitespace-pre-wrap">{patient.notes}</p>
                  </>
                )}
              </div>
            </TabsContent>
            <TabsContent value="historial" className="space-y-4 pt-4">
              {appointments.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay turnos registrados.
                </p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((a) => (
                    <Card key={a.id} size="sm">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {formatDate(a.scheduled_at)}
                          </CardTitle>
                          <Badge variant="secondary">
                            {statusLabels[a.status] ?? a.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      {(a.procedures_performed || a.recommendations) && (
                        <CardContent className="pt-0 text-sm">
                          {a.procedures_performed && (
                            <p>
                              <span className="text-muted-foreground">
                                Procedimientos:
                              </span>{' '}
                              {a.procedures_performed}
                            </p>
                          )}
                          {a.recommendations && (
                            <p>
                              <span className="text-muted-foreground">
                                Recomendaciones:
                              </span>{' '}
                              {a.recommendations}
                            </p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
