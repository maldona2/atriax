import { ChevronRight } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Configura tu práctica',
    description:
      'Crea tu cuenta, añade la información de tu consultorio o clínica, médicos y espacios. Te guiamos en cada paso del proceso.',
  },
  {
    step: '02',
    title: 'Invita a tu equipo',
    description:
      'Añade a tu personal con los roles adecuados. Importa tus datos existentes de pacientes de forma sencilla.',
  },
  {
    step: '03',
    title: 'Gestiona desde el día uno',
    description:
      'Empieza a agendar citas, gestionar pacientes y visualizar métricas. Soporte disponible cuando lo necesites.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Comienza en 3 simples pasos
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Implementación rápida sin complicaciones técnicas.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, i) => (
            <div key={i} className="relative">
              <div className="text-6xl font-bold text-secondary mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-muted-foreground">{item.description}</p>
              {i < 2 && (
                <ChevronRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
