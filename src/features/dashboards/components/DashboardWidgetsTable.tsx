"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Lock, TriangleAlert } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useUpdateDashboardWidget } from "@/features/dashboards/api/mutations";
import { useDashboardWidgets } from "@/features/dashboards/api/queries";
import { AssignedRolesEditor } from "@/features/dashboards/components/AssignedRolesEditor";
import type { DashboardWidget } from "@/features/dashboards/schemas";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";

const WIDGET_TYPE_LABEL: Record<DashboardWidget["type"], string> = {
  kpi: "KPI",
  list: "List",
  summary: "Summary",
  chart: "Chart",
};

const columnHelper = createColumnHelper<DashboardWidget>();

/**
 * §7.12 — the widget-to-role assignment table. **FR-ADM-06**: the Super User
 * "configure[s] dashboards for Operator/Supervisor/Management, assign[s]
 * widgets to roles, control[s] which metrics each role sees." **FR-DASH-02**
 * gives Admin the same capability.
 *
 * One row per widget in the fixed catalog `GET /dashboards/widgets` serves —
 * there is no "create a widget" action here, because nothing in the BRD or
 * this repo's contract grants one (`FR-ADM-07`: "Regular users do not have
 * full dashboard-creation access", and neither does this screen invent a
 * catalog-management capability the Super User was never given either).
 *
 * `canEdit` follows `WorkflowCard`'s convention: a session that may not write
 * sees the controls **disabled and explained**, not hidden — FR-ADM-03 is
 * enforced by the route guard and the `PUT` handler, not by pretending the
 * screen does not exist.
 */
export const DashboardWidgetsTable = () => {
  const { permissions } = useSession();
  const { data, isLoading, isError } = useDashboardWidgets();
  const updateWidget = useUpdateDashboardWidget();
  const canEdit = hasPermission(permissions, "dashboard:configure");

  const columns = useMemo(
    () => [
      columnHelper.accessor("label", { header: "Widget" }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => (
          <Badge variant="secondary">
            {WIDGET_TYPE_LABEL[info.getValue()]}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "assignedRoles",
        header: "Assigned roles",
        cell: ({ row }) => (
          <AssignedRolesEditor
            widget={row.original}
            canEdit={canEdit}
            disabled={
              updateWidget.isPending &&
              updateWidget.variables?.id === row.original.id
            }
            onChange={(assignedRoles) =>
              updateWidget.mutate({
                id: row.original.id,
                assignedRoles,
                enabled: row.original.enabled,
              })
            }
          />
        ),
      }),
      columnHelper.accessor("enabled", {
        header: "Enabled",
        cell: ({ row }) => (
          <Switch
            aria-label={`${row.original.label} enabled`}
            checked={row.original.enabled}
            disabled={
              !canEdit ||
              (updateWidget.isPending &&
                updateWidget.variables?.id === row.original.id)
            }
            onCheckedChange={(enabled) =>
              updateWidget.mutate({
                id: row.original.id,
                assignedRoles: row.original.assignedRoles,
                enabled,
              })
            }
          />
        ),
      }),
    ],
    [canEdit, updateWidget]
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // An error is not "no widgets configured" — see `WorkflowSettings`'s same
  // reasoning. Showing an empty table would tell a Super User the platform has
  // no widgets to assign, which is false.
  if (isError) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        The widget catalog could not be loaded, so assignments cannot be shown
        or changed. Reload to try again.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        table={table}
        caption="Every dashboard widget, its type, which roles it is assigned to, and whether it is currently enabled"
        emptyMessage="No widgets have been configured yet."
      />

      {canEdit ? null : (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Only a Super User or Administrator can change widget assignments.
        </p>
      )}
    </div>
  );
};
