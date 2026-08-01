"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CircleCheck, CircleX, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditTrail } from "@/features/audit/api/queries";
import { AuditFilterBar } from "@/features/audit/components/AuditFilterBar";
import { useAuditFilters } from "@/features/audit/hooks/useAuditFilters";
import type { AuditEvent } from "@/features/audit/schemas";
import { formatPlantTimestamp, PLANT_TIME_ZONE_LABEL } from "@/lib/datetime";

const columnHelper = createColumnHelper<AuditEvent>();

/**
 * The prototype's uppercase, letter-spaced column headers (`app-source.txt`
 * 1655) — kept to the column's own `header` renderer rather than the shared
 * `TableHead`, so every *other* `DataTable` in the app keeps its normal-case
 * headers.
 */
const headerLabel = (text: string) => (
  <span className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
    {text}
  </span>
);

/**
 * The prototype's header "Export" (`app-source.txt` 1648) — it only ever
 * fired a toast there too. **FR-REP-06** — "Record every report export in the
 * audit trail" — is real, and there is still no export endpoint in this
 * build, so this button does the same as the prototype's: nothing but the
 * toast. That is a UI-parity move, not a claim that exporting works; the
 * requirement stays reported unmet until a real endpoint exists to record
 * itself here.
 */
export const ExportAuditButton = () => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => toast.success("Audit log exported")}
  >
    <Download aria-hidden />
    Export
  </Button>
);

/**
 * The audit trail — **FR-ADM-05**, **§9.3**, **FR-OBS-01**.
 *
 * Ported from `audit()` (`app-source.txt` 1645–1660), whose six columns are the
 * spec: Timestamp · User · Role · Action · Target · Result. Three of the
 * prototype's treatments survive on purpose:
 *
 * - **Tabular numerals on the timestamp.** A column of times is scanned
 *   vertically, and proportional digits make it ragged.
 * - **The action in monospace.** These are constants a backend emits, not prose.
 * - **`System` for an actor-less row.** The retention purge has no person behind
 *   it, and a blank cell would read as missing data rather than as the fact.
 *
 * What did not survive: the prototype renders its Result cell in a hardcoded
 * green with a tick, unconditionally — there is no failure styling because it
 * has no failure row. Colour alone would fail WCAG 1.4.1 anyway, so the cell
 * carries an icon *and* the word.
 */
export const AuditTable = () => {
  const { filters, queryFilters, setFilter, reset, isFiltered } =
    useAuditFilters();

  const { data, isLoading, isFetching, isError } = useAuditTrail(queryFilters);

  const columns = useMemo(
    () => [
      columnHelper.accessor("occurredAt", {
        header: () => headerLabel(`Timestamp (${PLANT_TIME_ZONE_LABEL})`),
        cell: (info) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatPlantTimestamp(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("actor", {
        header: () => headerLabel("User"),
        cell: (info) => {
          const actor = info.getValue();
          return actor ? (
            <span className="font-medium">{actor.displayName}</span>
          ) : (
            // Not a blank cell: the platform itself did this.
            <span className="font-medium text-muted-foreground">System</span>
          );
        },
      }),
      columnHelper.accessor("roleLabel", {
        header: () => headerLabel("Role"),
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("action", {
        header: () => headerLabel("Action"),
        cell: (info) => (
          <span className="font-mono text-xs whitespace-nowrap text-primary">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("target", {
        header: () => headerLabel("Target"),
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("result", {
        header: () => headerLabel("Result"),
        cell: (info) => {
          const failed = info.getValue() === "failure";
          return (
            <span
              className={
                failed
                  ? "inline-flex items-center gap-1.5 font-medium text-destructive"
                  : "inline-flex items-center gap-1.5"
              }
            >
              {failed ? (
                <CircleX className="size-4 shrink-0" aria-hidden />
              ) : (
                <CircleCheck
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
              )}
              {failed ? "Failure" : "Success"}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    // The server does the paging and the filtering; the table re-slices nothing.
    manualPagination: true,
    manualFiltering: true,
    rowCount: data?.total ?? 0,
  });

  return (
    // One card holding the filter row, table and pagination — the prototype
    // keeps its chips outside the table's own card (`app-source.txt`
    // 1649–1660), but a single white surface is the closer match to how the
    // rest of this build already presents a filtered list (see
    // `NotificationsList`'s "Your notifications" card).
    <Card>
      <CardContent className="flex flex-col gap-4">
        <AuditFilterBar
          filters={filters}
          isFiltered={isFiltered}
          onChange={setFilter}
          onReset={reset}
        />

        {/*
          An error is not an empty log. Collapsing the two here would be the worst
          version of that mistake anywhere in the app: a 500 would render "No
          activity recorded yet" to somebody reviewing an audit trail, which is a
          positive false claim about whether anything happened.
        */}
        {isError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            The audit log could not be loaded. This is not an empty log —
            activity may have been recorded that is not shown here. Reload to
            try again.
          </p>
        ) : (
          <>
            <DataTable
              table={table}
              isLoading={isLoading}
              caption="Every recorded sign-in, approval, assistant question and settings change, newest first"
              emptyMessage={
                isFiltered
                  ? "No activity matches these filters."
                  : "No activity has been recorded yet."
              }
              // `--muted` is literally the prototype's `C.th` header-band
              // colour (see globals.css); the earlier `/60` diluted it toward
              // the card's white instead of matching.
              headerRowClassName="bg-muted"
              // Already inside this card's own border — a second one would
              // double up.
              bordered={false}
            />

            <DataTablePagination
              page={filters.page}
              pageSize={filters.pageSize}
              total={data?.total ?? 0}
              disabled={isFetching}
              onPageChange={(page) => setFilter("page", page)}
              onPageSizeChange={(pageSize) => setFilter("pageSize", pageSize)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
