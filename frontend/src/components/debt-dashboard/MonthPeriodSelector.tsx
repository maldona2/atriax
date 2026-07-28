import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  formatMonthValue,
  getCurrentMonthValue,
  shiftMonthValue,
} from '@/lib/monthRange';

interface MonthPeriodSelectorProps {
  value: string;
  onValueChange: Dispatch<SetStateAction<string>>;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, monthIndex) =>
  new Intl.DateTimeFormat('es-AR', { month: 'short' })
    .format(new Date(2024, monthIndex, 1))
    .replace('.', '')
);

export function MonthPeriodSelector({
  value,
  onValueChange,
}: MonthPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedYear = Number(value.slice(0, 4));
  const selectedMonthIndex = Number(value.slice(5, 7)) - 1;
  const [visibleYear, setVisibleYear] = useState(selectedYear);
  const currentMonth = getCurrentMonthValue();
  const isCurrentMonth = value === currentMonth;

  const handleOpenChange = (open: boolean) => {
    if (open) setVisibleYear(selectedYear);
    setIsOpen(open);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    onValueChange(`${visibleYear}-${month}`);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Período de deuda</p>
            {isCurrentMonth && <Badge variant="secondary">Mes actual</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Según la fecha del turno en indicadores, vista general e historial
          </p>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          onClick={() => onValueChange(shiftMonthValue(value, -1))}
          aria-label="Ver mes anterior"
          title="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-0 flex-1 justify-between px-3 capitalize sm:w-[190px] sm:flex-none"
              aria-label={`Elegir mes. Seleccionado: ${formatMonthValue(value)}`}
            >
              <span className="truncate">{formatMonthValue(value)}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(320px,calc(100vw-2rem))]"
          >
            <PopoverHeader>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  onClick={() => setVisibleYear((year) => year - 1)}
                  aria-label="Ver año anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <PopoverTitle className="text-base tabular-nums">
                  {visibleYear}
                </PopoverTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  onClick={() => setVisibleYear((year) => year + 1)}
                  aria-label="Ver año siguiente"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </PopoverHeader>

            <div className="grid grid-cols-3 gap-1">
              {MONTH_LABELS.map((label, monthIndex) => {
                const isSelected =
                  visibleYear === selectedYear &&
                  monthIndex === selectedMonthIndex;
                const monthValue = `${visibleYear}-${String(monthIndex + 1).padStart(2, '0')}`;
                const isCurrentOption = monthValue === currentMonth;

                return (
                  <Button
                    key={label}
                    type="button"
                    variant={isSelected ? 'default' : 'ghost'}
                    className={cn(
                      'h-12 flex-col gap-0 capitalize',
                      !isSelected && isCurrentOption && 'ring-1 ring-primary/40'
                    )}
                    onClick={() => handleMonthSelect(monthIndex)}
                    aria-pressed={isSelected}
                    aria-label={`${label}${isCurrentOption ? ', mes actual' : ''}`}
                  >
                    <span>{label}</span>
                    {isCurrentOption && (
                      <span
                        className={cn(
                          'text-[10px] font-normal',
                          isSelected
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground'
                        )}
                      >
                        Actual
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {!isCurrentMonth && (
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={() => {
                  onValueChange(currentMonth);
                  setIsOpen(false);
                }}
              >
                Volver al mes actual
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          onClick={() => onValueChange(shiftMonthValue(value, 1))}
          aria-label="Ver mes siguiente"
          title="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
