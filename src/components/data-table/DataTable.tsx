"use client";

import {
  flexRender,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Screen-reader description of what the table contains. */
  caption: string;
  /** Per-row class hook, e.g. to dim a suspended record. */
  getRowClassName?: (row: Row<TData>) => string | undefined;
  /** Optional styling for the header row — e.g. `AuditTable`'s shaded band. */
  headerRowClassName?: string;
  /** `false` drops the wrapper's own border/rounding, for a caller already nesting this in its own bordered container. */
  bordered?: boolean;
}

/**
 * The only place a raw `<table>` is assembled. Features build a
 * table instance with `useReactTable` and hand it here.
 */
export const DataTable = <TData,>({
  table,
  isLoading = false,
  emptyMessage = "Nothing to show yet.",
  caption,
  getRowClassName,
  headerRowClassName,
  bordered = true,
}: DataTableProps<TData>) => {
  const columnCount = table.getAllLeafColumns().length;
  const rows = table.getRowModel().rows;

  return (
    <div className={cn("overflow-x-auto", bordered && "rounded-md border")}>
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className={headerRowClassName}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {Array.from({ length: columnCount }).map((__, cellIndex) => (
                  <TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className={getRowClassName?.(row)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
