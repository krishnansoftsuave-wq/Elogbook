"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEntriesList } from "@/features/entries/api/queries";
import { DeleteEntryDialog } from "@/features/entries/components/DeleteEntryDialog";
import { EntriesFilterBar } from "@/features/entries/components/EntriesFilterBar";
import { EntryStatusBadge } from "@/features/entries/components/EntryStatusBadge";
import { useEntryFilters } from "@/features/entries/hooks/useEntryFilters";
import type { Entry } from "@/types/entry";
import type { EntryScope } from "@/features/entries/types";

const columnHelper = createColumnHelper<Entry>();

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface EntriesTableProps {
  scope: EntryScope;
  caption: string;
  emptyMessage: string;
}

export const EntriesTable = ({
  scope,
  caption,
  emptyMessage,
}: EntriesTableProps) => {
  const { filters, queryFilters, setFilter, reset, isFiltered } =
    useEntryFilters(scope);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);

  const { data, isLoading, isFetching } = useEntriesList(queryFilters);

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", { header: "Title" }),
      columnHelper.accessor("authorName", { header: "Author" }),
      columnHelper.accessor("performedAt", {
        header: "Performed",
        cell: (info) => dateFormatter.format(new Date(info.getValue())),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <EntryStatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {/* Links styled as buttons, not `Button`s rendering links. Base UI's
                `Button` assumes a native `<button>` and, told otherwise, stamps
                `role="button"` on the anchor — overriding its implicit `link`
                role and dropping it out of a screen reader's list of links.
                These navigate, so they stay links. The `aria-label` rides along
                unchanged; it is still the accessible name. */}
            <Link
              href={ROUTES.ENTRY_PREVIEW(row.original.id)}
              aria-label={`Preview ${row.original.title}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Eye aria-hidden />
            </Link>
            {/* A signed entry is a legal record — it can no longer be edited. */}
            {row.original.status === "signed" ? null : (
              <>
                <Link
                  href={ROUTES.ENTRY_EDIT(row.original.id)}
                  aria-label={`Edit ${row.original.title}`}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                  })}
                >
                  <Pencil aria-hidden />
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.original.title}`}
                  onClick={() => setEntryToDelete(row.original)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            )}
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    // The server does the paging; the table must not re-slice the rows.
    manualPagination: true,
    manualFiltering: true,
    rowCount: data?.total ?? 0,
  });

  return (
    <div className="flex flex-col gap-4">
      <EntriesFilterBar
        idPrefix={scope}
        filters={filters}
        isFiltered={isFiltered}
        onChange={setFilter}
        onReset={reset}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        caption={caption}
        emptyMessage={
          isFiltered ? "No entries match these filters." : emptyMessage
        }
      />

      <DataTablePagination
        page={filters.page}
        pageSize={filters.pageSize}
        total={data?.total ?? 0}
        disabled={isFetching}
        onPageChange={(page) => setFilter("page", page)}
        onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
      />

      <DeleteEntryDialog
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
      />
    </div>
  );
};
