import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 text-balance">
          Transforma la gestión de tu práctica médica hoy
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
          No pierdas otro día con operaciones desorganizadas. Únete a cientos de
          médicos y clínicas que ya confían en Atriax.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className="gap-2">
            Comenzar prueba gratis
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
          >
            Agendar una demo
          </Button>
        </div>
        <p className="mt-6 text-sm text-primary-foreground/60">
          Sin tarjeta de crédito · Cancela cuando quieras
        </p>
      </div>
    </section>
  );
}
