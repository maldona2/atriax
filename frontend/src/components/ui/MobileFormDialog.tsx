import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MobileFormDialogProps {
  open: boolean;
  onOpenChange: (_isOpen: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * A form dialog that renders as a full-screen overlay on mobile (< 640px)
 * and as a centered dialog on desktop (>= 640px).
 */
export function MobileFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: MobileFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-lg sm:gap-4 sm:p-4">
        <DialogHeader className="shrink-0 px-4 pt-4 sm:px-0 sm:pt-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-0 sm:py-0">
          {children}
        </div>
        <DialogFooter className="shrink-0">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
