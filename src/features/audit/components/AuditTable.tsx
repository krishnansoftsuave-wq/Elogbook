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

// Uppercase, letter-spaced column headers — kept to this column's own renderer so every other DataTable keeps its normal-case headers.
const headerLabel = (text: string) => (
  <span className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
    {text}
  </span>
);

// No export endpoint exists yet (FR-REP-06 stays unmet), so this only toasts — not a claim that exporting works.
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

// The audit trail (FR-ADM-05, §9.3, FR-OBS-01) — six columns: Timestamp, User, Role, Action, Target, Result. Result carries an icon and the word, not colour alone (WCAG 1.4.1).
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
    // One card holding the filter row, table and pagination, matching how the rest of this build presents a filtered list.
    <Card>
      <CardContent className="flex flex-col gap-4">
        <AuditFilterBar
          filters={filters}
          isFiltered={isFiltered}
          onChange={setFilter}
          onReset={reset}
        />

        {/* An error is not an empty log — "No activity recorded yet" on a 500 would be a false claim. */}
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
              headerRowClassName="bg-muted"
              bordered={false} // already inside this card's own border
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
