import { z } from "zod";

import { ROLE_VALUES } from "@/constants/roles";
import { envelopeSchema } from "@/lib/zod";

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

/** `PUT /dashboards/widgets/:id` answers with the single widget it changed. */
export const dashboardWidgetDetailResponseSchema = envelopeSchema(
  dashboardWidgetWireSchema
);

export const dashboardWidgetUpdateSchema = z.object({
  assigned_roles: z.array(z.enum(ROLE_VALUES)),
  enabled: z.boolean(),
});
