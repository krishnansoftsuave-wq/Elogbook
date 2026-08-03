import { z } from "zod";

import { ROLE_VALUES, ROLES, type Role } from "@/constants/roles";
import {
  healthStatusSchema,
  type HealthStatus,
} from "@/features/monitoring/schemas";
import { envelopeSchema } from "@/lib/zod";

/**
 * The Super User's dashboard cards — the prototype's `dashboard()` for
 * `role === 'superuser'` (app-source.txt 1133–1165), which is the only role
 * that screen is reachable by.
 *
 * Four cards come from here: the fixed **Logbook Activity — This Shift** strip
 * (`logKpiCard`'s `superuser` row, 759) and the three widgets **Active Users**
 * (`widgetBody` case `users`, 331), **System Health** (case `health`, 332) and
 * **Logbook Compliance** (case `compliance`, 324).
 *
 * ## ⚠️ Why this is not `features/monitoring`
 *
 * Half of these figures are platform telemetry and would have been at home in
 * §7.11's payload. They are not there for one reason: `GET /admin/monitoring`
 * is gated on the **wildcard permission** — §6.4 gives system health to the
 * Administrator and §6.5's five Super User bullets say nothing about it — so
 * reusing it would have meant widening an Administrator-only endpoint to make a
 * dashboard card draw. Adding a sibling is the smaller change and leaves the
 * access decision where §6 put it.
 *
 * ## ⚠️ No requirement covers the figures
 *
 * Every other schema in this repo cites an `FR-` id. This one cannot, in the
 * same way and for the same reason as `features/plant-ops/schemas.ts`: the
 * Super User's dashboard was delivered in the prototype and BRD v1.3 describes
 * the Super User's *job* (§6.5 — dashboard configuration and permissions)
 * rather than their home screen. So:
 *
 * - **Custom dashboards** and **role adoption** are prototype inventions with
 *   no counting definition anywhere. Twelve is the prototype's role count
 *   (`ROLES`, 4–33); this build has five (`constants/roles.ts`), which is
 *   exactly the sort of thing that makes "9 / 12" meaningless as a measurement.
 * - **Logbook compliance** — "entries signed on time" — has no source. The
 *   platform reads the E-Logbook and does not own it (**FR-DATA-01**), and no
 *   contract exposes a signature timestamp, so it is not obvious the figure
 *   could be computed at all.
 *
 * ⚠️ **Nothing says so on screen.** The owner had the equivalent banner deleted
 * from the plant-operations cards, so adding one here would reopen a settled
 * decision — `PlatformCards.tsx` records the reasoning where a reader of the
 * components will meet it. A compliance percentage reads as an audit fact and a
 * screenshot outlives the conversation that explained it, so this should be
 * raised with the client before sign-off.
 *
 * PROVISIONAL field names — **[BACKEND]**. Nothing constrains them.
 */

const usersByRoleWireSchema = z.object({
  role: z.enum(ROLE_VALUES),
  count: z.number(),
});

const platformServiceWireSchema = z.object({
  name: z.string(),
  status: healthStatusSchema,
});

export const platformOverviewWireSchema = z.object({
  /* --- Logbook Activity — This Shift (`logKpiCard`, superuser row) -------- */

  audit_events_today: z.number(),
  active_users_24h: z.number(),
  provisioned_users: z.number(),
  /** ⚠️ Invented — see the file header. */
  custom_dashboards: z.number(),
  /** How many roles built them. Invented. */
  custom_dashboard_roles: z.number(),
  /** ⚠️ Invented. "Roles active this week", against `total_roles`. */
  active_roles: z.number(),
  total_roles: z.number(),

  /* --- Active Users ------------------------------------------------------- */

  /**
   * A headcount per role. Typed as `Role` rather than a free string so a
   * mis-cased key from a future backend fails the parse instead of rendering a
   * row nobody can name — the same reason `assigned_roles` is an enum.
   */
  users_by_role: z.array(usersByRoleWireSchema),

  /* --- System Health ------------------------------------------------------ */

  services: z.array(platformServiceWireSchema),
  /**
   * The prototype's fourth row is `['Last backup', '02:00']` — a time, not a
   * status. Carried as a timestamp so the screen formats it in plant time
   * rather than trusting a server to have picked the right zone.
   */
  last_backup_at: z.string(),

  /* --- Logbook Compliance ------------------------------------------------- */

  /** ⚠️ Invented — see the file header. */
  compliance_percent: z.number(),
});

export type PlatformOverviewWire = z.infer<typeof platformOverviewWireSchema>;

export const platformOverviewResponseSchema = envelopeSchema(
  platformOverviewWireSchema
);

export interface UsersByRole {
  role: Role;
  count: number;
}

/** The same shape `SystemMonitor` renders, so one health vocabulary serves both. */
export interface PlatformService {
  name: string;
  status: HealthStatus;
}

export interface PlatformOverview {
  auditEventsToday: number;
  activeUsers24h: number;
  provisionedUsers: number;
  customDashboards: number;
  customDashboardRoles: number;
  activeRoles: number;
  totalRoles: number;
  usersByRole: UsersByRole[];
  services: PlatformService[];
  lastBackupAt: string;
  compliancePercent: number;
}

export const toPlatformOverview = (
  wire: PlatformOverviewWire
): PlatformOverview => ({
  auditEventsToday: wire.audit_events_today,
  activeUsers24h: wire.active_users_24h,
  provisionedUsers: wire.provisioned_users,
  customDashboards: wire.custom_dashboards,
  customDashboardRoles: wire.custom_dashboard_roles,
  activeRoles: wire.active_roles,
  totalRoles: wire.total_roles,
  usersByRole: wire.users_by_role,
  services: wire.services,
  lastBackupAt: wire.last_backup_at,
  compliancePercent: wire.compliance_percent,
});

/**
 * "Operators", not "Operator" — the prototype's own row labels (`widgetBody`
 * case `users`, 331). `ROLE_LABEL` is the singular form used everywhere a role
 * names one person, and pluralising it at the call site with a trailing "s"
 * would produce "Managements".
 */
export const ROLE_PLURAL_LABEL: Record<Role, string> = {
  [ROLES.OPERATOR]: "Operators",
  [ROLES.SUPERVISOR]: "Supervisors",
  [ROLES.MANAGEMENT]: "Management",
  [ROLES.ADMINISTRATOR]: "Administrators",
  [ROLES.SUPER_USER]: "Super Users",
};

/**
 * `142 of 190` as `75%` — the prototype prints both halves in one caption
 * (`'of 190 · 75%'`, 759) and hardcodes the percentage, which is how the two
 * drift apart the first time either number changes.
 *
 * Zero provisioned users is not an error and not 0% — it is a ratio with no
 * denominator, and the caller drops the clause rather than printing "NaN%".
 */
export const adoptionPercent = (
  active: number,
  provisioned: number
): number | null =>
  provisioned > 0 ? Math.round((active / provisioned) * 100) : null;
