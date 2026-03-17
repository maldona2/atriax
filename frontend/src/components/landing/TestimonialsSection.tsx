import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    quote:
      'Desde que usamos Atriax, redujimos los no-shows en un 35%. La organización del consultorio mejoró completamente.',
    name: 'Dra. Carmen Vidal',
    role: 'Médica Clínica General, Centro de Salud Integral',
    metric: '-35% no-shows',
  },
  {
    quote:
      'Por fin tengo toda la información de mis pacientes en un solo lugar. El historial clínico digital es invaluable para el seguimiento.',
    name: 'Dr. Miguel Fernández',
    role: 'Traumatólogo, Centro Médico Aurora',
    metric: '100% historiales digitalizados',
  },
  {
    quote:
      'Gestionar 3 consultorios de distintas especialidades era un caos. Ahora con Atriax, tengo control total desde cualquier lugar.',
    name: 'Laura Martínez',
    role: 'Directora de Operaciones, Grupo Médico Salud+',
    metric: '3 consultorios unificados',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-card border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Lo que dicen nuestros clientes
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((item, i) => (
            <Card key={i} className="bg-background border-border">
              <CardContent className="p-6">
                <div className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full mb-4">
                  {item.metric}
                </div>
                <blockquote className="text-foreground mb-6">
                  &quot;{item.quote}&quot;
                </blockquote>
                <div>
                  <div className="font-semibold text-foreground">
                    {item.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.role}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
