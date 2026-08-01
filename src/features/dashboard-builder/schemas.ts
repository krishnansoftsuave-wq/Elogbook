import { z } from "zod";

import { ROLE_VALUES } from "@/constants/roles";
import { envelopeSchema } from "@/lib/zod";

/**
 * Dashboard Builder — the prototype's `dashboards()` flow (`app-source.txt`
 * 2045–2192): a per-role dashboard list → drag-reorder builder → widget
 * library → read-only preview → publish + version history.
 *
 * **This is not a BRD requirement.** FR-ADM-06/07 and FR-DASH-01/02/04/05
 * are fully satisfied by `features/dashboards` (`dashboardWidgetSchema`) —
 * one fixed widget catalog, a global `enabled` flag, `assigned_roles` per
 * widget. No FR/NFR asks for per-role dashboard entities, a draft/publish
 * lifecycle, or version snapshots. This feature exists because the user
 * explicitly asked for the prototype's literal flow (2026-08-01), after
 * being shown that gap and choosing "Full prototype flow (new scope)" plus
 * "Full mock version snapshots" for Publish. `features/dashboards` is
 * untouched and remains the BRD-driven contract; this is additional,
 * prototype-parity UI layered beside it.
 */

export const DASHBOARD_BUILDER_WIDGET_TYPES = [
  "kpi",
  "list",
  "summary",
  "table",
  "line",
  "bar",
  "pie",
  "text",
] as const;
export const dashboardBuilderWidgetTypeSchema = z.enum(
  DASHBOARD_BUILDER_WIDGET_TYPES
);
export type DashboardBuilderWidgetType = z.infer<
  typeof dashboardBuilderWidgetTypeSchema
>;

export const DASHBOARD_STATUSES = ["draft", "published"] as const;
export const dashboardStatusSchema = z.enum(DASHBOARD_STATUSES);
export type DashboardStatus = z.infer<typeof dashboardStatusSchema>;

export const LAYOUT_COLUMNS = [2, 3, 4] as const;
export const layoutColumnsSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type LayoutColumns = z.infer<typeof layoutColumnsSchema>;

/**
 * One widget row **on a specific role's dashboard** — has a display `order`
 * and no `assignedRoles`, unlike `dashboardWidgetSchema` in
 * `features/dashboards`, whose widgets belong to a shared catalog and carry
 * their own role list. A widget here belongs to exactly one dashboard.
 */
export const dashboardBuilderWidgetWireSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: dashboardBuilderWidgetTypeSchema,
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const dashboardBuilderWidgetSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: dashboardBuilderWidgetTypeSchema,
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export type DashboardBuilderWidgetWire = z.infer<
  typeof dashboardBuilderWidgetWireSchema
>;
export type DashboardBuilderWidget = z.infer<
  typeof dashboardBuilderWidgetSchema
>;

export const toDashboardBuilderWidget = (
  wire: DashboardBuilderWidgetWire
): DashboardBuilderWidget => ({
  id: wire.id,
  label: wire.label,
  type: wire.type,
  enabled: wire.enabled,
  order: wire.order,
});

export const toDashboardBuilderWidgetWire = (
  widget: DashboardBuilderWidget
): DashboardBuilderWidgetWire => ({
  id: widget.id,
  label: widget.label,
  type: widget.type,
  enabled: widget.enabled,
  order: widget.order,
});

export const dashboardConfigWireSchema = z.object({
  id: z.string(),
  /** The dashboard's primary role — what the list/URL are keyed by. */
  role: z.enum(ROLE_VALUES),
  name: z.string(),
  status: dashboardStatusSchema,
  widgets: z.array(dashboardBuilderWidgetWireSchema),
  /**
   * Every role this dashboard is pushed to on publish — the builder's
   * "Assigned roles" chip editor (`app-source.txt` 2110). Always includes
   * `role`; `+ Add role` extends it, matching the prototype's chip group.
   */
  assigned_roles: z.array(z.enum(ROLE_VALUES)),
  layout_columns: layoutColumnsSchema,
  is_default: z.boolean(),
  last_updated_at: z.string(),
  last_published_at: z.string().nullable(),
  published_version: z.string().nullable(),
  affected_user_count: z.number().int().nonnegative(),
});

export const dashboardConfigSchema = z.object({
  id: z.string(),
  role: z.enum(ROLE_VALUES),
  name: z.string(),
  status: dashboardStatusSchema,
  widgets: z.array(dashboardBuilderWidgetSchema),
  assignedRoles: z.array(z.enum(ROLE_VALUES)),
  layoutColumns: layoutColumnsSchema,
  isDefault: z.boolean(),
  lastUpdatedAt: z.string(),
  lastPublishedAt: z.string().nullable(),
  publishedVersion: z.string().nullable(),
  affectedUserCount: z.number().int().nonnegative(),
});

export type DashboardConfigWire = z.infer<typeof dashboardConfigWireSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;

export const toDashboardConfig = (
  wire: DashboardConfigWire
): DashboardConfig => ({
  id: wire.id,
  role: wire.role,
  name: wire.name,
  status: wire.status,
  widgets: wire.widgets.map(toDashboardBuilderWidget),
  assignedRoles: wire.assigned_roles,
  layoutColumns: wire.layout_columns,
  isDefault: wire.is_default,
  lastUpdatedAt: wire.last_updated_at,
  lastPublishedAt: wire.last_published_at,
  publishedVersion: wire.published_version,
  affectedUserCount: wire.affected_user_count,
});

export const dashboardConfigListResponseSchema = envelopeSchema(
  z.object({ items: z.array(dashboardConfigWireSchema) })
);
export const dashboardConfigDetailResponseSchema = envelopeSchema(
  dashboardConfigWireSchema
);

/**
 * `PUT /dashboard-builder/configs/:role` — the whole editable surface of the
 * builder screen in one write, same reasoning as `dashboardWidgetUpdateSchema`
 * (`features/dashboards/schemas.ts`): a retry under NFR-12 must land the same
 * values, not compound a partial write against whatever the server now holds.
 */
export const dashboardConfigUpdateSchema = z.object({
  widgets: z.array(dashboardBuilderWidgetWireSchema),
  assigned_roles: z.array(z.enum(ROLE_VALUES)),
  layout_columns: layoutColumnsSchema,
  is_default: z.boolean(),
});

export type DashboardConfigUpdate = z.infer<typeof dashboardConfigUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Widget library — the catalog a dashboard can add widgets from             */
/* -------------------------------------------------------------------------- */

export const LIBRARY_CATEGORIES = [
  "KPI cards",
  "Charts",
  "Tables",
  "Lists",
  "Notes",
] as const;
export const libraryCategorySchema = z.enum(LIBRARY_CATEGORIES);
export type LibraryCategory = z.infer<typeof libraryCategorySchema>;

export const libraryWidgetWireSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: dashboardBuilderWidgetTypeSchema,
  category: libraryCategorySchema,
});

/**
 * `GET /dashboard-builder/library?role=` answers with this shape, not the
 * bare catalog: `added` is per-request (relative to the role queried), so it
 * cannot live on the static catalog entry the way `category` does.
 */
export const libraryWidgetResultWireSchema = libraryWidgetWireSchema.extend({
  added: z.boolean(),
});

export const libraryWidgetSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: dashboardBuilderWidgetTypeSchema,
  category: libraryCategorySchema,
  added: z.boolean(),
});

export type LibraryWidgetWire = z.infer<typeof libraryWidgetWireSchema>;
export type LibraryWidgetResultWire = z.infer<
  typeof libraryWidgetResultWireSchema
>;
export type LibraryWidget = z.infer<typeof libraryWidgetSchema>;

export const toLibraryWidget = (
  wire: LibraryWidgetResultWire
): LibraryWidget => ({
  id: wire.id,
  label: wire.label,
  type: wire.type,
  category: wire.category,
  added: wire.added,
});

export const libraryResponseSchema = envelopeSchema(
  z.object({ items: z.array(libraryWidgetResultWireSchema) })
);

/* -------------------------------------------------------------------------- */
/* Publish & versions                                                         */
/* -------------------------------------------------------------------------- */

export const DASHBOARD_VERSION_STATUSES = ["live", "archived"] as const;
export const dashboardVersionStatusSchema = z.enum(DASHBOARD_VERSION_STATUSES);
export type DashboardVersionStatus = z.infer<
  typeof dashboardVersionStatusSchema
>;

/**
 * A full snapshot of a dashboard's widget list at the moment it was
 * published. Confirmed scope (`AskUserQuestion`, 2026-08-01): "Full mock
 * version snapshots" — a real Restore reverts the live config to this
 * snapshot, rather than rendering a version table with nothing behind it.
 */
export const dashboardVersionWireSchema = z.object({
  id: z.string(),
  dashboard_id: z.string(),
  version: z.string(),
  changed_by: z.string(),
  changed_at: z.string(),
  status: dashboardVersionStatusSchema,
  widgets_snapshot: z.array(dashboardBuilderWidgetWireSchema),
  layout_columns_snapshot: layoutColumnsSchema,
  changelog: z.array(z.string()),
});

export const dashboardVersionSchema = z.object({
  id: z.string(),
  dashboardId: z.string(),
  version: z.string(),
  changedBy: z.string(),
  changedAt: z.string(),
  status: dashboardVersionStatusSchema,
  widgetsSnapshot: z.array(dashboardBuilderWidgetSchema),
  layoutColumnsSnapshot: layoutColumnsSchema,
  changelog: z.array(z.string()),
});

export type DashboardVersionWire = z.infer<typeof dashboardVersionWireSchema>;
export type DashboardVersion = z.infer<typeof dashboardVersionSchema>;

export const toDashboardVersion = (
  wire: DashboardVersionWire
): DashboardVersion => ({
  id: wire.id,
  dashboardId: wire.dashboard_id,
  version: wire.version,
  changedBy: wire.changed_by,
  changedAt: wire.changed_at,
  status: wire.status,
  widgetsSnapshot: wire.widgets_snapshot.map(toDashboardBuilderWidget),
  layoutColumnsSnapshot: wire.layout_columns_snapshot,
  changelog: wire.changelog,
});

export const dashboardVersionListResponseSchema = envelopeSchema(
  z.object({ items: z.array(dashboardVersionWireSchema) })
);

/** `POST /dashboard-builder/configs/:role/publish` — publishes the current draft as a new version. */
export const dashboardPublishResponseSchema = envelopeSchema(
  z.object({
    config: dashboardConfigWireSchema,
    version: dashboardVersionWireSchema,
  })
);

/** `POST /dashboard-builder/configs/:role/versions/:versionId/restore` */
export const dashboardRestoreResponseSchema = envelopeSchema(
  dashboardConfigWireSchema
);
