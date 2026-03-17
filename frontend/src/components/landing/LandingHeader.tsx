import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AtriaxLogo } from './AtriaxLogo';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <AtriaxLogo />
            <span className="text-xl font-semibold text-foreground">
              Atriax
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#beneficios"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Beneficios
            </a>
            <a
              href="#funcionalidades"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#precios"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Precios
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              asChild
            >
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Prueba gratis</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
