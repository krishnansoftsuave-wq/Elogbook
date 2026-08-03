"use client";

import { ROLES } from "@/constants/roles";
import { useDashboardWidgets } from "@/features/dashboards/api/queries";
import { hasRenderer } from "@/features/dashboards/widgetRegistry";
import {
  isConfigurableRole,
  type DashboardWidget,
} from "@/features/dashboards/schemas";
import { useRoleVariant } from "@/features/auth/hooks/useRoleVariant";

/**
 * The Super User's dashboard, by id and in order —
 * `defaultWidgets('superuser')` (app-source.txt 139), whose four entries are
 * `kpi`, `users`, `health` and `compliance`.
 *
 * **This is the one role whose widget set is written in code, and it is not a
 * layout decision.** FR-DASH-01's config screen has three columns — Operator,
 * Supervisor, Management — so there is no box anybody can tick to give a Super
 * User a widget. Their set therefore has to come from somewhere other than the
 * assignment table, and the prototype is the only thing that specifies it.
 *
 * The alternative this replaces was the published-set fallback below, which
 * handed the Super User all twelve renderable widgets including six plant-ops
 * cards. That is not what the prototype's Super User dashboard is, and "every
 * widget that exists" is not a dashboard anyone designed.
 *
 * Reversing it is deleting the branch: the fallback is still there for the
 * Administrator and would resume serving both.
 */
const SUPER_USER_WIDGET_IDS: readonly string[] = [
  "WID-001", // Shift KPIs — the prototype titles it "System KPIs" for this role
  "WID-014", // Active Users
  "WID-015", // System Health
  "WID-016", // Logbook Compliance
];

export interface RoleWidgets {
  widgets: DashboardWidget[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * The widgets this session's dashboard should show — **FR-DASH-01**'s
 * "predefined, role-based dashboards", read from the configuration
 * **FR-DASH-02** lets the Super User edit.
 *
 * Three filters, each for its own reason:
 *
 * 1. **`enabled`** — the Super User's publish switch. Off means off for
 *    everyone, which is what makes it a standardisation control rather than a
 *    suggestion.
 * 2. **assigned to this role** — FR-ADM-06's whole point.
 * 3. **has a renderer** — a widget the library declares but this build cannot
 *    draw (WID-005, whose definitions FR-AN-06 leaves "to be confirmed") must
 *    not leave a titled empty box on the dashboard. An unrenderable widget is
 *    invisible here and still fully assignable on the config screen, which is
 *    the honest split: the configuration is real, the drawing is not built.
 *
 * `useRoleVariant().role` rather than `session.roles[0]`: the shell already
 * resolves impersonation and the Supervisor/Superintendent sub-category
 * switcher, and a dashboard that disagreed with the sidebar about who you are
 * would be worse than either answer alone.
 *
 * ## The unconfigurable roles cannot be filtered by assignment
 *
 * **FR-DASH-01** names three roles, so the config screen has three columns and
 * the library assigns to three roles. Filtering an Administrator or a Super
 * User by assignment therefore gives them an empty dashboard **that nobody has
 * any way to fill** — there is no column to tick. Each gets its own answer:
 *
 * - **Super User** — the prototype's own four-widget set, by id and in its
 *   order (`SUPER_USER_WIDGET_IDS` above). It is a designed screen, and it is
 *   the screen the client was shown.
 * - **Administrator** — the published set, which is **FR-HOME-02**'s answer
 *   ("default the home view to everything the user may see"). Largely
 *   theoretical: §6.4 sends them to the system monitor instead of this screen.
 *
 * Neither fallback is keyed on *"did the filter return nothing"* — an Operator
 * with every widget unassigned must see the empty dashboard the Super User
 * chose for them, not silently get all of them back, which would make
 * FR-DASH-02's control unenforceable.
 */
export const useRoleWidgets = (): RoleWidgets => {
  const { role } = useRoleVariant();
  const { data, isLoading, isError } = useDashboardWidgets();

  const published = (data ?? []).filter(
    (widget) => widget.enabled && hasRenderer(widget.id)
  );

  if (isConfigurableRole(role)) {
    return {
      widgets: published.filter((widget) =>
        widget.assignedRoles.includes(role)
      ),
      isLoading,
      isError,
    };
  }

  if (role === ROLES.SUPER_USER) {
    /*
      Mapped over the id list rather than filtered by it: the prototype's order
      is `kpi, users, health, compliance`, and filtering `published` would have
      returned the library's order instead — which puts Shift KPIs after the
      three platform cards. `flatMap` drops an id the library does not publish,
      so unpublishing one still removes it from everybody (FR-DASH-02).
    */
    const byId = new Map(published.map((widget) => [widget.id, widget]));
    return {
      widgets: SUPER_USER_WIDGET_IDS.flatMap((id) => byId.get(id) ?? []),
      isLoading,
      isError,
    };
  }

  return { widgets: published, isLoading, isError };
};
