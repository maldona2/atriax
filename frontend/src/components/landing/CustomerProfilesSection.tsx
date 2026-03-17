import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, BarChart3 } from 'lucide-react';

const profiles = [
  {
    icon: Building2,
    title: 'Consultorios individuales',
    description:
      'Médicos independientes de cualquier especialidad que buscan profesionalizar y digitalizar su gestión diaria.',
  },
  {
    icon: Users,
    title: 'Clínicas multi-especialidad',
    description:
      'Centros con varios médicos y especialistas que necesitan coordinar agendas y compartir información de pacientes.',
  },
  {
    icon: BarChart3,
    title: 'Grupos y redes médicas',
    description:
      'Organizaciones con múltiples sedes o franquicias que requieren visibilidad centralizada y control unificado.',
  },
];

export function CustomerProfilesSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            ¿Para quién es Atriax?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Para médicos de cualquier especialidad: clínica general, pediatría,
            cardiología, traumatología, dermatología, y más.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {profiles.map((item, i) => (
            <Card key={i} className="bg-card border-border text-center">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
                  <item.icon className="h-8 w-8 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
