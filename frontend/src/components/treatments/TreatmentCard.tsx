import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Treatment } from '@/types';

interface TreatmentCardProps {
  treatment: Treatment;
  onEdit: (_t: Treatment) => void;
  onDelete: (_id: string) => void;
}

export function TreatmentCard({
  treatment,
  onEdit,
  onDelete,
}: TreatmentCardProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{treatment.name}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Precio: {formatCurrency(treatment.price_cents)}</span>
          <span>
            Costo:{' '}
            {treatment.cost_cents !== null
              ? formatCurrency(treatment.cost_cents)
              : '—'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onEdit(treatment)}
          aria-label={`Editar ${treatment.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-destructive hover:text-destructive"
          onClick={() => onDelete(treatment.id)}
          aria-label={`Eliminar ${treatment.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
