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
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{treatment.name}</p>
        <p className="text-sm text-muted-foreground">
          ${(treatment.price_cents / 100).toFixed(2)} por sesión
        </p>
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
