"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { History, RotateCcw } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { useDashboardVersions } from "@/features/dashboard-builder/api/queries";
import { useRestoreDashboardVersion } from "@/features/dashboard-builder/api/mutations";
import { DashboardVersionStatusPill } from "@/features/dashboard-builder/components/DashboardStatusPill";
import { DataTableColumnHeader } from "@/features/dashboard-builder/components/DataTableColumnHeader";
import type { DashboardVersion } from "@/features/dashboard-builder/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";

const columnHelper = createColumnHelper<DashboardVersion>();

interface DashboardVersionsTableProps {
  role: string;
}

/**
 * The prototype's `dashPublish` version-history table (`app-source.txt`
 * 2178–2186). Real snapshots and a working Restore, per the confirmed scope
 * ("Full mock version snapshots") in `features/dashboard-builder/schemas.ts`.
 */
export const DashboardVersionsTable = ({
  role,
}: DashboardVersionsTableProps) => {
  const { data, isLoading } = useDashboardVersions(role);
  const restore = useRestoreDashboardVersion();

  const columns = useMemo(
    () => [
      columnHelper.accessor("version", {
        header: () => <DataTableColumnHeader>Version</DataTableColumnHeader>,
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("changedBy", {
        header: () => <DataTableColumnHeader>Changed by</DataTableColumnHeader>,
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("changedAt", {
        header: () => <DataTableColumnHeader>Date</DataTableColumnHeader>,
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatPlantTimestamp(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: () => <DataTableColumnHeader>Status</DataTableColumnHeader>,
        cell: (info) => <DashboardVersionStatusPill status={info.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: () => (
          <DataTableColumnHeader>
            <span className="sr-only">Actions</span>
          </DataTableColumnHeader>
        ),
        cell: ({ row }) =>
          row.original.status === "live" ? (
            <History
              className="ml-auto size-4.5 text-muted-foreground"
              aria-label="Currently live"
            />
          ) : (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate({
                    role,
                    versionId: row.original.id,
                    version: row.original.version,
                  })
                }
              >
                <RotateCcw aria-hidden />
                Restore
              </Button>
            </div>
          ),
      }),
    ],
    [restore, role]
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      caption="Every published version of this dashboard, who changed it, when, and whether it is currently live"
      emptyMessage="No versions have been published yet."
    />
  );
};
