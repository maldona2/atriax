import * as React from 'react';
import { cn } from '@/lib/utils';

interface MobileChartContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps chart content with a height that adapts to viewport size:
 * 200px on mobile, 300px on sm+.
 */
export function MobileChartContainer({
  children,
  className,
}: MobileChartContainerProps) {
  return (
    <div className={cn('h-[200px] sm:h-[300px]', className)}>{children}</div>
  );
}
