import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText, Users, BarChart3 } from 'lucide-react';

const problems = [
  {
    icon: Calendar,
    title: 'Conflictos de agenda',
    description:
      'Citas duplicadas, solapamientos y confusión entre proveedores y salas.',
  },
  {
    icon: FileText,
    title: 'Registros dispersos',
    description:
      'Historiales en papel, WhatsApp y hojas de cálculo. Imposible tener visión completa.',
  },
  {
    icon: Users,
    title: 'Múltiples proveedores',
    description:
      'Coordinar calendarios de varios profesionales es una pesadilla.',
  },
  {
    icon: BarChart3,
    title: 'Sin visibilidad',
    description:
      'Desconoces el rendimiento real de tu clínica y dónde mejorar.',
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-card border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            El caos diario en consultorios médicos
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            ¿Reconoces estos problemas? No estás solo.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((item, i) => (
            <Card key={i} className="bg-background border-border">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
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
