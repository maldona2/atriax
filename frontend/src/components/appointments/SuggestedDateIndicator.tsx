import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalculationDetails } from '@/hooks/useSuggestedAppointmentDate';

interface SuggestedDateIndicatorProps {
  calculationDetails: CalculationDetails;
  isModified: boolean;
}

export function SuggestedDateIndicator({
  calculationDetails,
  isModified,
}: SuggestedDateIndicatorProps) {
  const phaseLabel =
    calculationDetails.phase === 'initial'
      ? 'fase inicial'
      : 'fase de mantenimiento';

  const weeks = calculationDetails.frequencyWeeks;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        isModified
          ? 'border-muted bg-muted/30 text-muted-foreground'
          : 'border-primary/20 bg-primary/5 text-primary'
      )}
      aria-live="polite"
      aria-label={`Fecha sugerida por tratamiento ${calculationDetails.treatmentName}`}
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {isModified && 'Fecha modificada. '}
        Sugerido por <strong>{calculationDetails.treatmentName}</strong> —{' '}
        {phaseLabel}, cada {weeks} semana{weeks !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
