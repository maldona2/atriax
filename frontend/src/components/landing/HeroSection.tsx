import { Button } from '@/components/ui/button';
import { Shield, Clock, Sparkles, ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
              Gestiona tu consultorio médico con claridad total
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              La plataforma integral para médicos y profesionales de la salud.
              Organiza citas, historiales clínicos y operaciones en un solo
              lugar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="gap-2">
                Comenzar prueba gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Agendar una demo
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <span>Datos seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span>99.9% uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Para toda especialidad médica</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-card rounded-2xl shadow-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-chart-4/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded-lg w-2/3" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-24 bg-secondary rounded-lg" />
                  <div className="h-24 bg-secondary rounded-lg" />
                  <div className="h-24 bg-secondary rounded-lg" />
                </div>
                <div className="h-32 bg-muted rounded-lg" />
                <div className="flex gap-3">
                  <div className="h-10 bg-primary rounded-lg flex-1" />
                  <div className="h-10 bg-secondary rounded-lg flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
