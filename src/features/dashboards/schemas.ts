import { z } from "zod";

import { ROLE_VALUES, ROLES, type Role } from "@/constants/roles";
import { envelopeSchema } from "@/lib/zod";

/**
 * The roles whose dashboards are configurable — **FR-DASH-01**, verbatim:
 * *"predefined, role-based dashboards (Operator, Supervisor, Management)"*, and
 * §6.5's *"configure dashboards for Operator/Supervisor/Management"*.
 *
 * Administrator and Super User are absent from both lists on purpose. Their
 * homes are elsewhere — §6.4 sends the Administrator to a *"System
 * Administration dashboard"* (FR-OBS-04) and §6.5 makes the Super User's job
 * the configuration screen itself — so there is no widget column for either,
 * and `useRoleWidgets` gives them the published set rather than nothing.
 *
 * Order is the role hierarchy, not alphabetical: it is also the column order.
 */
export const CONFIGURABLE_ROLES: readonly Role[] = [
  ROLES.OPERATOR,
  ROLES.SUPERVISOR,
  ROLES.MANAGEMENT,
];

export const isConfigurableRole = (role: Role): boolean =>
  CONFIGURABLE_ROLES.includes(role);

/**
 * Dashboard widget configuration — §7.12.
 *
 * **FR-ADM-06** — the Super User "assign[s] widgets to roles" and "control[s]
 * which metrics each role sees".
 * **FR-ADM-07 / FR-DASH-01** — dashboards are predefined per role for
 * standardisation; "Regular users do not have full dashboard-creation access."
 * **FR-DASH-04** — regular users get limited personalisation only (hide, resize,
 * save layout).
 * **FR-DASH-05** — that personalisation "does not affect the standard dashboard
 * configured for other users". Two requirements, cited separately: the second
 * clause was previously folded into FR-DASH-04, which does not contain it.
 *
 * The prototype stores each widget as a positional tuple
 * `['Shift KPIs', 'KPI', true]` (`state.dashWidgets`, app-source.txt 112). Named
 * fields here, plus `assigned_roles` — which the tuple has nowhere to put, and
 * without which FR-ADM-06 cannot be expressed at all.
 *
 * PROVISIONAL field names.
 */

export const WIDGET_TYPES = ["kpi", "list", "summary", "chart"] as const;
export const widgetTypeSchema = z.enum(WIDGET_TYPES);
export type WidgetType = z.infer<typeof widgetTypeSchema>;

export const dashboardWidgetWireSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: widgetTypeSchema,
  /** FR-ADM-06 — which roles this widget is published to. Empty = unassigned. */
  assigned_roles: z.array(z.enum(ROLE_VALUES)),
  enabled: z.boolean(),
});

export const dashboardWidgetSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: widgetTypeSchema,
  assignedRoles: z.array(z.enum(ROLE_VALUES)),
  enabled: z.boolean(),
});

export type DashboardWidgetWire = z.infer<typeof dashboardWidgetWireSchema>;
export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;

export const toDashboardWidget = (
  wire: DashboardWidgetWire
): DashboardWidget => ({
  id: wire.id,
  label: wire.label,
  type: wire.type,
  assignedRoles: wire.assigned_roles,
  enabled: wire.enabled,
});

export const dashboardWidgetListResponseSchema = envelopeSchema(
  z.object({ items: z.array(dashboardWidgetWireSchema) })
);

/** `PUT /dashboards/widgets/:id` answers with the saved widget, not a list. */
export const dashboardWidgetDetailResponseSchema = envelopeSchema(
  dashboardWidgetWireSchema
);

export const dashboardWidgetUpdateSchema = z.object({
  assigned_roles: z.array(z.enum(ROLE_VALUES)),
  enabled: z.boolean(),
});

export type DashboardWidgetUpdate = z.infer<typeof dashboardWidgetUpdateSchema>;

/**
 * What a caller passes the mutation: the widget's id plus the full new state.
 *
 * The endpoint is a `PUT` of both fields rather than a patch of one, which is
 * what makes it idempotent under **NFR-12** — replaying it lands the same
 * assignment. Callers therefore send the values they want to end up with, not
 * the delta.
 */
export interface DashboardWidgetUpdateValues extends DashboardWidgetUpdate {
  id: string;
}

/* -------------------------------------------------------------------------- */
/* Personal layout — FR-DASH-04 / FR-DASH-05                                   */
/* -------------------------------------------------------------------------- */

/**
 * One user's personalisation of one widget — **FR-DASH-04**: *"hide widgets,
 * resize/expand widgets, save a preferred layout, focus on role-relevant
 * widgets"*.
 *
 * Three fields and no more, because FR-DASH-04 lists exactly three powers.
 * Notably absent is anything that could **add** a widget: **FR-ADM-07** is
 * explicit that *"regular users do not have full dashboard-creation access"*,
 * so a layout can only ever subtract from, reorder, or resize what the Super
 * User assigned. A layout entry naming a widget the role is not assigned is
 * inert rather than additive — `applyLayout` starts from the role's list.
 *
 * Order is the array's own order. A `position` integer would be a second
 * source of truth for the same fact, and the two disagree the moment a widget
 * is added to or removed from the role's set.
 *
 * PROVISIONAL field names — no backend contract covers this endpoint yet.
 */
export const dashboardLayoutEntryWireSchema = z.object({
  widget_id: z.string(),
  hidden: z.boolean(),
  /** Spans both columns. The prototype's `w.wide` (app-source.txt 1147). */
  wide: z.boolean(),
});

export const dashboardLayoutResponseSchema = envelopeSchema(
  z.object({ items: z.array(dashboardLayoutEntryWireSchema) })
);

export const dashboardLayoutUpdateSchema = z.object({
  items: z.array(dashboardLayoutEntryWireSchema),
});

export type DashboardLayoutEntryWire = z.infer<
  typeof dashboardLayoutEntryWireSchema
>;

export interface DashboardLayoutEntry {
  widgetId: string;
  hidden: boolean;
  wide: boolean;
}

export const toDashboardLayoutEntry = (
  wire: DashboardLayoutEntryWire
): DashboardLayoutEntry => ({
  widgetId: wire.widget_id,
  hidden: wire.hidden,
  wide: wire.wide,
});

export const toDashboardLayoutWire = (
  entry: DashboardLayoutEntry
): DashboardLayoutEntryWire => ({
  widget_id: entry.widgetId,
  hidden: entry.hidden,
  wide: entry.wide,
});

/**
 * The role's widgets, arranged by this user's saved layout.
 *
 * **The role's list is the source of truth for *which* widgets exist**; the
 * layout only says how they are shown. That ordering of authority is what makes
 * **FR-DASH-05** hold in the direction that matters: a Super User revoking a
 * widget removes it from everybody, including users whose saved layout still
 * names it. The reverse — a stale layout resurrecting a revoked widget — would
 * make the standardisation control unenforceable.
 *
 * Widgets with no layout entry keep their configured order and land after the
 * arranged ones, so a newly assigned widget appears rather than vanishing into
 * an old layout that never mentioned it.
 */
export const applyLayout = <TWidget extends { id: string }>(
  widgets: readonly TWidget[],
  layout: readonly DashboardLayoutEntry[],
  /** Starting width for a widget this layout says nothing about. */
  wideByDefault: (id: string) => boolean = () => false
): { widget: TWidget; hidden: boolean; wide: boolean }[] => {
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const seen = new Set<string>();
  const arranged: { widget: TWidget; hidden: boolean; wide: boolean }[] = [];

  for (const entry of layout) {
    const widget = byId.get(entry.widgetId);
    if (!widget || seen.has(entry.widgetId)) continue;
    seen.add(entry.widgetId);
    arranged.push({ widget, hidden: entry.hidden, wide: entry.wide });
  }

  for (const widget of widgets) {
    if (seen.has(widget.id)) continue;
    arranged.push({
      widget,
      hidden: false,
      wide: wideByDefault(widget.id),
    });
  }

  return arranged;
};
