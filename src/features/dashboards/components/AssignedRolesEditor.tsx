"use client";

import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, ROLE_VALUES } from "@/constants/roles";
import { cn } from "@/lib/utils";
import type { DashboardWidget } from "@/features/dashboards/schemas";

interface AssignedRolesEditorProps {
  widget: DashboardWidget;
  canEdit: boolean;
  disabled: boolean;
  onChange: (assignedRoles: DashboardWidget["assignedRoles"]) => void;
}

/**
 * **FR-ADM-06** — "assign widgets to roles". One chip per platform role
 * (`ROLE_VALUES`, not a curated subset): the requirement names
 * Operator/Supervisor/Management, but the widget contract itself
 * (`dashboardWidgetSchema.assignedRoles`) does not exclude Administrator or
 * Super User, and narrowing the editor to three roles would silently make the
 * other two unassignable with no way to fix it from this screen.
 *
 * A toggle-chip group rather than a combobox/popover: there is no
 * `cmdk`/`Popover` primitive in this repo, and five fixed, always-visible
 * options do not need one — a `Badge` acting as a toggle button is the
 * smallest control that shows every option and its state at once.
 */
export const AssignedRolesEditor = ({
  widget,
  canEdit,
  disabled,
  onChange,
}: AssignedRolesEditorProps) => {
  const toggle = (role: (typeof ROLE_VALUES)[number]) => {
    const isAssigned = widget.assignedRoles.includes(role);
    onChange(
      isAssigned
        ? widget.assignedRoles.filter((candidate) => candidate !== role)
        : [...widget.assignedRoles, role]
    );
  };

  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label={`Roles assigned to ${widget.label}`}
    >
      {ROLE_VALUES.map((role) => {
        const isAssigned = widget.assignedRoles.includes(role);
        return (
          <button
            key={role}
            type="button"
            disabled={!canEdit || disabled}
            aria-pressed={isAssigned}
            onClick={() => toggle(role)}
            className={cn(
              "rounded-4xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              !canEdit && "cursor-not-allowed"
            )}
          >
            <Badge
              variant={isAssigned ? "default" : "outline"}
              className="pointer-events-none"
            >
              {ROLE_LABEL[role]}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};
