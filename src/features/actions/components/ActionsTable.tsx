"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { OverdueFlag } from "@/components/OverdueFlag";
import { PriorityDot } from "@/components/PriorityDot";
import { StatusPill } from "@/components/StatusPill";
import { ROUTES } from "@/constants/routes";
import { useActionAreas, useActionsList } from "@/features/actions/api/queries";
import { ActionsFilterBar } from "@/features/actions/components/ActionsFilterBar";
import type { Action } from "@/features/actions/schemas";
import { useActionFilters } from "@/features/actions/hooks/useActionFilters";
import { SuggestionsPanel } from "@/features/suggestions/components/SuggestionsPanel";
import { formatPlantDateTime } from "@/lib/datetime";
import { useNow } from "@/hooks/useNow";

/**
 * The pending-actions list — the prototype's `pending` table
 * (`app-source.txt` 1209–1228), translated.
 *
 * Four translations worth naming:
 *
 * - **The row is not clickable; the ID is a link.** The prototype puts
 *   `onClick` on the `<tr>` (1212), which no keyboard can reach, cannot be
 *   opened in a new tab, and has no accessible name. A `<Link>` in the ID cell
 *   is reachable, linkable and announced.
 * - **Overdue is a flag beside the due date, not a row tint.** The prototype
 *   paints the row `#FCF2F0` when `status === 'Overdue'` (1212) — colour as the
 *   only signal (WCAG 1.4.1), on a status FR-PA-04 does not define. `OverdueFlag`
 *   derives it from due date + status per FR-PA-06 and says the word.
 * - **The kebab menu is gone.** Its "Ignore action" item (1226) deletes an
 *   action from client state; there is no endpoint and no requirement for it.
 *   Status changes live on the detail screen, where FR-PA-05's gate can be
 *   explained rather than silently failing from a dropdown.
 * - **Paging is the server's.** `manualPagination` with `rowCount` from the
 *   response; the prototype slices locally with `paged()`.
 */

const columnHelper = createColumnHelper<Action>();

/*
  Plant time, via `lib/datetime`. This screen predates that module and carried
  its own zone-less `Intl.DateTimeFormat`, so the same release rendered a due
  date in the viewer's zone here and in GST on `/summaries` and `/notifications`.
  For a viewer behind GST that shifted a due date onto the **previous calendar
  day** while the `OverdueFlag` beside it stayed derived from the true instant —
  the date and the flag disagreeing on the same row.
*/
const formatDue = (iso: string): string => formatPlantDateTime(iso) || "—";

export const ActionsTable = () => {
  const { filters, queryFilters, setFilter, reset, isFiltered } =
    useActionFilters();

  const { data, isLoading, isFetching } = useActionsList(queryFilters);

  /**
   * One instant for the whole table, rather than each row asking the clock —
   * and one that is `null` until mount, so the server HTML carries nothing
   * time-dependent to mismatch on. See `useNow`.
   */
  const now = useNow();

  /**
   * From its own unfiltered query, never from `data`. Deriving the options from
   * the filtered response made the control delete its own alternatives:
   * selecting an area left only that area in the list. See `useActionAreas`.
   */
  const { data: areas } = useActionAreas();

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Action ID",
        cell: (info) => (
          <Link
            href={ROUTES.ACTION_DETAIL(info.getValue())}
            className="font-semibold text-accent-foreground underline-offset-4 hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <span className="line-clamp-2 max-w-[22rem]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("area", { header: "Area" }),
      columnHelper.accessor("equipment", { header: "Equipment" }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => <PriorityDot priority={info.getValue()} />,
      }),
      columnHelper.accessor("dueAt", {
        header: "Due",
        cell: (info) => (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <span className="tabular-nums">{formatDue(info.getValue())}</span>
            <OverdueFlag
              dueAt={info.getValue()}
              status={info.row.original.status}
              at={now}
            />
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusPill kind="action" status={info.getValue()} />,
      }),
      columnHelper.accessor((action) => action.createdBy.displayName, {
        id: "createdBy",
        header: "Created by",
      }),
    ],
    [now]
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    // The server does the paging and the filtering; the table must not re-slice.
    manualPagination: true,
    manualFiltering: true,
    rowCount: data?.total ?? 0,
  });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/*
        FR-PA-02's review queue, above the table exactly as the prototype places
        it (`app-source.txt` 1231). It renders nothing at all for a session
        without `action:confirm`, or when the queue is empty.
      */}
      <SuggestionsPanel />

      <ActionsFilterBar
        filters={filters}
        isFiltered={isFiltered}
        areas={areas ?? []}
        onChange={setFilter}
        onReset={reset}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        caption="Pending actions, with area, equipment, priority, due date and status"
        emptyMessage={
          isFiltered
            ? "No actions match these filters."
            : "No pending actions for this shift."
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
    </div>
  );
};
