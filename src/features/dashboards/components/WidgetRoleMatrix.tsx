"use client";

import { LayoutTemplate, Lock } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Notice } from "@/components/Notice";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roleLabel, type Role } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useUpdateDashboardWidget } from "@/features/dashboards/api/mutations";
import { useDashboardWidgets } from "@/features/dashboards/api/queries";
import {
  CONFIGURABLE_ROLES,
  type DashboardWidget,
} from "@/features/dashboards/schemas";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Widget → role assignment — **FR-DASH-02**, **FR-ADM-06**.
 *
 * ## Why only three role columns
 *
 * **FR-DASH-01** names them: *"predefined, role-based dashboards (Operator,
 * Supervisor, Management)"*, and §6.5 says the Super User *"configure[s]
 * dashboards for Operator/Supervisor/Management"*. Administrator and Super User
 * are absent from both lists on purpose — their dashboards are the system
 * monitor (FR-OBS-04) and this screen, neither of which is composed from the
 * widget library.
 *
 * ## The bug that shape invites, and how it is avoided
 *
 * `assigned_roles` accepts all five roles and `PUT` replaces the whole array.
 * Rendering three checkboxes and rebuilding the array from them alone would
 * silently **drop** any administrator or super_user assignment the moment
 * somebody toggled an unrelated row — a data loss with no UI anywhere to
 * reveal it. `nextRolesFor` therefore preserves every role this table does not
 * show. FR-DASH-05 is what makes that worth the care: this array is everybody
 * else's dashboard, not the editor's own.
 */

/**
 * The next `assigned_roles` after toggling one cell, preserving any role the
 * table does not render. Exported for the test that pins exactly that.
 */
export const nextRolesFor = (
  widget: DashboardWidget,
  role: Role,
  assigned: boolean
): Role[] => {
  const untouched = widget.assignedRoles.filter(
    (candidate) => !CONFIGURABLE_ROLES.includes(candidate)
  );

  const configured = CONFIGURABLE_ROLES.filter((candidate) =>
    candidate === role ? assigned : widget.assignedRoles.includes(candidate)
  );

  return [...configured, ...untouched];
};

/** `kpi` → `KPI`, `list` → `List`. The wire values are lowercase tokens. */
const typeLabel = (type: DashboardWidget["type"]): string =>
  type === "kpi" ? "KPI" : type.charAt(0).toUpperCase() + type.slice(1);

export const WidgetRoleMatrix = () => {
  const { permissions } = useSession();
  const { data, isLoading, isError } = useDashboardWidgets();
  const updateWidget = useUpdateDashboardWidget();

  /*
    The route guard already requires this, so a session without it should never
    reach the screen. Checked again because FR-ADM-03 is about the API and the
    guard both, and because a custom role (FR-ADM-02) can hold a combination
    this build never anticipated — in which case the right outcome is a
    readable read-only table, not a page of controls that all 403.
  */
  const canEdit = hasPermission(permissions, ["dashboard:configure"]);

  if (isError) {
    return (
      <Notice live>
        The widget library could not be loaded, so dashboard assignments cannot
        be shown or changed. Reload to try again.
      </Notice>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const widgets = data ?? [];

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="No widgets are defined"
        description="There is nothing to assign to a role yet."
      />
    );
  }

  const isSaving = (widget: DashboardWidget) =>
    updateWidget.isPending && updateWidget.variables?.id === widget.id;

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? null : (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your role can view this configuration but not change it. Dashboard
          configuration belongs to the Super User and the Administrator.
        </p>
      )}

      {/* Six columns do not fit 375px; the table scrolls inside its own box so
          the page never does (`.claude/rules/01`). */}
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Widget</TableHead>
              <TableHead>Type</TableHead>
              {CONFIGURABLE_ROLES.map((role) => (
                <TableHead key={role} className="text-center">
                  {roleLabel(role)}
                </TableHead>
              ))}
              <TableHead className="text-center">Published</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {widgets.map((widget) => (
              <TableRow key={widget.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {widget.label}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeLabel(widget.type)}</Badge>
                </TableCell>

                {CONFIGURABLE_ROLES.map((role) => {
                  const assigned = widget.assignedRoles.includes(role);

                  return (
                    <TableCell key={role} className="text-center">
                      <Switch
                        /*
                          Every switch on this screen looks identical, so the
                          label has to name both axes — without the widget name
                          a screen reader announces fifteen toggles called
                          "Operator".
                        */
                        aria-label={`${widget.label} — show to ${roleLabel(role)}`}
                        checked={assigned}
                        disabled={!canEdit || isSaving(widget)}
                        onCheckedChange={(next) =>
                          updateWidget.mutate({
                            id: widget.id,
                            assignedRoles: nextRolesFor(widget, role, next),
                            enabled: widget.enabled,
                          })
                        }
                      />
                    </TableCell>
                  );
                })}

                <TableCell className="text-center">
                  <Switch
                    aria-label={`${widget.label} — published`}
                    checked={widget.enabled}
                    disabled={!canEdit || isSaving(widget)}
                    onCheckedChange={(next) =>
                      updateWidget.mutate({
                        id: widget.id,
                        assignedRoles: [...widget.assignedRoles],
                        enabled: next,
                      })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Turning a widget off here removes it from every dashboard that shows it.
        Personal layout choices made by individual users are kept separately and
        are not affected.
      </p>
    </div>
  );
};
