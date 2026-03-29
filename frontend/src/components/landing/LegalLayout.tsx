import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AtriaxLogo } from './AtriaxLogo';
import { LandingFooter } from './LandingFooter';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Minimal header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <AtriaxLogo />
              <span className="text-xl font-semibold text-foreground">
                Atriax
              </span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="gap-2 flex items-center">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Volver al inicio</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero band */}
      <div className="bg-muted/40 border-b border-border py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Última actualización:{' '}
            <time
              dateTime={lastUpdated}
              className="font-medium text-foreground"
            >
              {new Date(lastUpdated).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </p>
        </div>
      </div>

      {/* Prose content */}
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <article className="prose prose-neutral dark:prose-invert max-w-none space-y-10">
            {children}
          </article>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

/* ---------- helpers for structured content blocks ---------- */

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 pl-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalDefinitions({
  entries,
}: {
  entries: { term: string; definition: string }[];
}) {
  return (
    <dl className="divide-y divide-border rounded-lg border border-border overflow-hidden text-sm">
      {entries.map(({ term, definition }) => (
        <div
          key={term}
          className="flex flex-col sm:flex-row gap-1 sm:gap-4 px-4 py-3 bg-card"
        >
          <dt className="font-semibold text-foreground shrink-0 sm:w-40">
            {term}
          </dt>
          <dd className="text-muted-foreground">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
