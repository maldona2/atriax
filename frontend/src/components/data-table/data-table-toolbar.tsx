'use client';

import * as React from 'react';
import type { DataTableFilterField } from '@/types';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { Table } from '@tanstack/react-table';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableViewOptions } from '@/components/data-table/data-table-view-options';

interface DataTableToolbarProps<
  TData,
> extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>;
  filterFields?: DataTableFilterField<TData>[];
  pdfTable?: boolean;
}

export function DataTableToolbar<TData>({
  table,
  filterFields = [],
  children,
  className,
  pdfTable,
  ...props
}: DataTableToolbarProps<TData>) {
  const { searchableColumns, filterableColumns } = React.useMemo(() => {
    return {
      searchableColumns: filterFields.filter((field) => !field.options),
      filterableColumns: filterFields.filter((field) => field.options),
    };
  }, [filterFields]);

  // Estado local para inputs de búsqueda
  const [searchValues, setSearchValues] = React.useState<
    Record<string, string>
  >({});

  // Manejo de cambios en los inputs
  const handleInputChange = (columnId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [columnId]: value }));
  };

  // Aplicar filtros al presionar el botón de "Buscar"
  const handleSearch = () => {
    Object.entries(searchValues).forEach(([columnId, value]) => {
      table.getColumn(columnId)?.setFilterValue(value);
    });
  };

  const handleReset = () => {
    setSearchValues({});
    table.resetColumnFilters();
  };

  const hasSearchValues = Object.values(searchValues).some(
    (value) => value.trim().length > 1
  );

  return (
    <div
      className={cn(
        'flex w-full items-center justify-between space-x-2 overflow-auto p-1',
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center space-x-2">
        {searchableColumns.length > 0 &&
          searchableColumns.map(
            (column) =>
              table.getColumn(column.value ? String(column.value) : '') && (
                <>
                  <Input
                    key={String(column.value)}
                    placeholder={column.placeholder}
                    value={searchValues[String(column.value) ?? ''] ?? ''}
                    onChange={(event) =>
                      handleInputChange(
                        String(column.value),
                        event.target.value
                      )
                    }
                    className="h-8 w-40 lg:w-64"
                  />
                  <Button
                    aria-label="Apply filters"
                    variant="outline"
                    className="h-8 px-2 lg:px-3"
                    onClick={handleSearch}
                  >
                    Buscar
                  </Button>
                </>
              )
          )}
        {filterableColumns.length > 0 &&
          filterableColumns.map(
            (column) =>
              table.getColumn(column.value ? String(column.value) : '') && (
                <DataTableFacetedFilter
                  key={String(column.value)}
                  column={table.getColumn(
                    column.value ? String(column.value) : ''
                  )}
                  title={column.label}
                  options={column.options ?? []}
                />
              )
          )}
        {hasSearchValues && (
          <Button
            aria-label="Reset filters"
            variant="destructive"
            className="h-8 px-2 lg:px-3"
            onClick={handleReset}
          >
            Limpiar
            <Cross2Icon className="ml-2 size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      {!pdfTable && (
        <div className="flex items-center gap-2">
          {children}
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}
