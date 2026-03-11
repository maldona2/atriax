'use client';

import { MixerHorizontalIcon } from '@radix-ui/react-icons';
import type { Table, HeaderContext } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Modificar columnas"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <MixerHorizontalIcon className="mr-2 size-4" />
          Vista
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Modificar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== 'undefined' && column.getCanHide()
          )
          .map((column) => {
            const headerContent = column.columnDef.header
              ? typeof column.columnDef.header === 'function'
                ? column.columnDef.header({ column, table } as HeaderContext<
                    TData,
                    unknown
                  >)
                : column.columnDef.header
              : column.id;

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                <span className="truncate">{headerContent}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
