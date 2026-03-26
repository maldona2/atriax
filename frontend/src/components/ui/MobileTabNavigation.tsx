import * as React from 'react';
import { cn } from '@/lib/utils';
import { TabsList } from '@/components/ui/tabs';

type MobileTabNavigationProps = React.ComponentPropsWithoutRef<typeof TabsList>;

export function MobileTabNavigation({
  className,
  children,
  ...props
}: MobileTabNavigationProps) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <TabsList className={cn('flex w-max min-w-full', className)} {...props}>
        {children}
      </TabsList>
    </div>
  );
}
