"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Info, Plus, Save, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABEL, ROLE_VALUES, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  usePublishDashboard,
  useSaveDashboardDraft,
} from "@/features/dashboard-builder/api/mutations";
import { useDashboardConfig } from "@/features/dashboard-builder/api/queries";
import { WidgetReorderList } from "@/features/dashboard-builder/components/WidgetReorderList";
import {
  LAYOUT_COLUMNS,
  type DashboardBuilderWidget,
  type LayoutColumns,
} from "@/features/dashboard-builder/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";

interface DashboardBuilderViewProps {
  role: string;
}

/**
 * The prototype's `dashBuilder` (`app-source.txt` 2071–2098). ⚠️
 * PROTOTYPE-ONLY, see `features/dashboard-builder/schemas.ts`.
 */
export const DashboardBuilderView = ({ role }: DashboardBuilderViewProps) => {
  const router = useRouter();
  const { data: config, isLoading } = useDashboardConfig(role);
  const saveDraft = useSaveDashboardDraft();
  const publish = usePublishDashboard();

  if (isLoading || !config) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const roleLabel = ROLE_LABEL[config.role] ?? config.role;

  const saveWidgets = (widgets: readonly DashboardBuilderWidget[]) => {
    saveDraft.mutate({
      role,
      widgets,
      assignedRoles: config.assignedRoles,
      layoutColumns: config.layoutColumns,
      isDefault: config.isDefault,
    });
  };

  const saveLayoutColumns = (layoutColumns: LayoutColumns) => {
    saveDraft.mutate({
      role,
      widgets: config.widgets,
      assignedRoles: config.assignedRoles,
      layoutColumns,
      isDefault: config.isDefault,
    });
  };

  const saveAssignedRoles = (assignedRoles: readonly Role[]) => {
    saveDraft.mutate({
      role,
      widgets: config.widgets,
      assignedRoles,
      layoutColumns: config.layoutColumns,
      isDefault: config.isDefault,
    });
  };

  const saveIsDefault = (isDefault: boolean) => {
    saveDraft.mutate({
      role,
      widgets: config.widgets,
      assignedRoles: config.assignedRoles,
      layoutColumns: config.layoutColumns,
      isDefault,
    });
  };

  const removableRoles = ROLE_VALUES.filter(
    (candidate) => !config.assignedRoles.includes(candidate)
  );

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link
          href={ROUTES.ADMIN.DASHBOARD_BUILDER.LIST}
          className="hover:underline"
        >
          Dashboards
        </Link>
        <span className="mx-1.5" aria-hidden>
          ›
        </span>
        <span className="text-foreground">
          {roleLabel} · {config.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {roleLabel} · {config.name}
            </h1>
            <Badge
              variant={config.status === "published" ? "default" : "outline"}
            >
              {config.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.lastPublishedAt
              ? `Last published ${formatPlantTimestamp(config.lastPublishedAt)}`
              : "Never published"}{" "}
            · {config.affectedUserCount} users affected
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={ROUTES.ADMIN.DASHBOARD_BUILDER.PREVIEW(role)}
            className="inline-flex"
          >
            <Button type="button" variant="outline">
              <Eye aria-hidden />
              Preview
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={saveDraft.isPending}
            onClick={() => saveWidgets(config.widgets)}
          >
            <Save aria-hidden />
            Save draft
          </Button>
          <Button
            type="button"
            disabled={publish.isPending}
            onClick={() =>
              publish.mutate(role, {
                onSuccess: () => {
                  router.push(
                    `${ROUTES.ADMIN.DASHBOARD_BUILDER.VERSIONS(role)}?published=1`
                  );
                },
              })
            }
          >
            <Upload aria-hidden />
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">
              Widgets in this dashboard
            </span>
            <Link href={ROUTES.ADMIN.DASHBOARD_BUILDER.LIBRARY(role)}>
              <Button type="button" size="sm">
                <Plus aria-hidden />
                Add widget
              </Button>
            </Link>
          </div>
          <WidgetReorderList widgets={config.widgets} onChange={saveWidgets} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Assigned roles
            </p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {config.assignedRoles.map((assignedRole) => (
                <span
                  key={assignedRole}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {ROLE_LABEL[assignedRole]}
                  <button
                    type="button"
                    aria-label={`Remove ${ROLE_LABEL[assignedRole]} from assigned roles`}
                    disabled={config.assignedRoles.length <= 1}
                    onClick={() =>
                      saveAssignedRoles(
                        config.assignedRoles.filter((r) => r !== assignedRole)
                      )
                    }
                    className="disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              ))}
              {removableRoles.length > 0 ? (
                <Select
                  value=""
                  onValueChange={(value) => {
                    const role = removableRoles.find(
                      (candidate) => candidate === value
                    );
                    if (role)
                      saveAssignedRoles([...config.assignedRoles, role]);
                  }}
                >
                  <SelectTrigger
                    aria-label="Add role"
                    className="h-auto w-fit rounded-full border-dashed px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    <SelectValue placeholder="+ Add role" />
                  </SelectTrigger>
                  <SelectContent>
                    {removableRoles.map((candidate) => (
                      <SelectItem key={candidate} value={candidate}>
                        {ROLE_LABEL[candidate]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Layout columns
            </p>
            <div className="mb-4 inline-flex overflow-hidden rounded-md border">
              {LAYOUT_COLUMNS.map((columns) => (
                <button
                  key={columns}
                  type="button"
                  aria-pressed={config.layoutColumns === columns}
                  onClick={() => saveLayoutColumns(columns)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium",
                    config.layoutColumns === columns
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {columns}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm">Set as default for role</p>
                <p className="text-xs text-muted-foreground">
                  Shown first when users sign in
                </p>
              </div>
              <Switch
                aria-label="Set as default for role"
                checked={config.isDefault}
                onCheckedChange={saveIsDefault}
              />
            </div>
          </div>

          <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-sm text-primary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Changes are saved as a draft. Publish to push them to all{" "}
              {roleLabel}s.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
