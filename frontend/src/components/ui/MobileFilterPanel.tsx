import * as React from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileFilterPanelProps {
  children: React.ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  className?: string;
}

export function MobileFilterPanel({
  children,
  onApply,
  onClear,
  className,
}: MobileFilterPanelProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('md:hidden', className)}>
      <Button
        variant="outline"
        size="sm"
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border bg-card p-4">
          {children}
          {(onApply || onClear) && (
            <div className="flex gap-2 pt-1">
              {onClear && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onClear}
                >
                  Limpiar
                </Button>
              )}
              {onApply && (
                <Button size="sm" className="flex-1" onClick={onApply}>
                  Aplicar
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
