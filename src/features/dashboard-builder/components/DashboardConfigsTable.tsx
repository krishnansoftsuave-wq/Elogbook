"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { buttonVariants } from "@/components/ui/button";
import { ROLE_LABEL } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useDashboardConfigs } from "@/features/dashboard-builder/api/queries";
import { DashboardStatusPill } from "@/features/dashboard-builder/components/DashboardStatusPill";
import { DataTableColumnHeader } from "@/features/dashboard-builder/components/DataTableColumnHeader";
import type { DashboardConfig } from "@/features/dashboard-builder/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";

const columnHelper = createColumnHelper<DashboardConfig>();

const widgetSummary = (config: DashboardConfig): string => {
  const count = config.widgets.length;
  return `${count} widget${count === 1 ? "" : "s"} · ${config.layoutColumns} cols`;
};

/**
 * §7.12's screenshot flow — `dashList` (`app-source.txt` 2056–2059). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 *
 * One row per role, not paginated: the row count is the role count, which
 * this build never grows past five (same reasoning `RolesTable` gives for
 * its own small, fixed list).
 */
export const DashboardConfigsTable = () => {
  const { data, isLoading } = useDashboardConfigs();

  const columns = useMemo(
    () => [
      columnHelper.accessor("role", {
        header: () => <DataTableColumnHeader>Role</DataTableColumnHeader>,
        cell: (info) => (
          <span className="font-semibold">
            {ROLE_LABEL[info.getValue()] ?? info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("name", {
        header: () => <DataTableColumnHeader>Dashboard</DataTableColumnHeader>,
      }),
      columnHelper.display({
        id: "widgets",
        header: () => <DataTableColumnHeader>Widgets</DataTableColumnHeader>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {widgetSummary(row.original)}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: () => <DataTableColumnHeader>Status</DataTableColumnHeader>,
        cell: (info) => <DashboardStatusPill status={info.getValue()} />,
      }),
      columnHelper.accessor("lastUpdatedAt", {
        header: () => (
          <DataTableColumnHeader>Last updated</DataTableColumnHeader>
        ),
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatPlantTimestamp(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <DataTableColumnHeader>Actions</DataTableColumnHeader>,
        cell: ({ row }) => (
          <Link
            href={ROUTES.ADMIN.DASHBOARD_BUILDER.EDIT(row.original.role)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Pencil aria-hidden />
            Edit dashboard
          </Link>
        ),
      }),
    ],
    []
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
      caption="Every role's dashboard, its widget and layout count, publish status and when it was last updated"
      emptyMessage="No role dashboards have been configured yet."
    />
  );
};
