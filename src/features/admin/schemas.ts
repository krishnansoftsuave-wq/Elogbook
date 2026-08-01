import { z } from "zod";

import { WILDCARD_PERMISSION, type Permission } from "@/constants/permissions";
import { ROLE_VALUES } from "@/constants/roles";
import { envelopeSchema, paginatedSchema } from "@/lib/zod";

/**
 * Administration — workflow toggles (§7.6, §7.5), shift configuration (§7.2) and
 * per-user notification permissions (§7.9).
 *
 * PROVISIONAL field names, from `app-source.txt` 114, 1987–2041. The envelope is
 * not provisional.
 */

/* -------------------------------------------------------------------------- */
/* Workflow toggles                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The four workflow switches (`adminWorkflows`, app-source.txt 1987–2006). Each
 * one turns a *default-off* capability on, and `WORKFLOW_PERMISSION` below
 * records which role owns each:
 *
 * | key | requirement |
 * | --- | --- |
 * | `operator_comment_permission` | **FR-SUM-08** — comment access on a summary is Admin/Super-User controlled; §6.1 "only if… granted". |
 * | `supervisor_action_workflow` | **FR-PA-05** — assignment/tracking/closure "only when the Administrator enables the workflow". |
 * | `management_decision_workflow` | **§6.3(a)/(b)** — "enabled = full workflow with notification; disabled = record only". |
 * | `predictive_insights` | ⚠️ **No requirement.** FR-AN-04 asks for Phase-1 predictive insight "subject to sufficient historical data" but says nothing about an Admin switch or a default. The toggle is prototype-derived (app-source.txt 2006) — confirm with the owner or drop it. |
 *
 * All four default **off**. That is not the BRD overruling the prototype: the
 * prototype's own cards print "When disabled (default)" and a `Default: OFF`
 * chip on every one of them, while its `state` happens to initialise three
 * `true`. Copy and requirement agree; only the seed was out of step.
 */
export const WORKFLOW_KEYS = [
  "operator_comment_permission",
  "supervisor_action_workflow",
  "management_decision_workflow",
  "predictive_insights",
] as const;

export const workflowKeySchema = z.enum(WORKFLOW_KEYS);
export type WorkflowKey = z.infer<typeof workflowKeySchema>;

export const WORKFLOW_LABEL: Record<WorkflowKey, string> = {
  operator_comment_permission: "Operator Comment Permission",
  supervisor_action_workflow: "Supervisor Action Workflow",
  management_decision_workflow: "Management Decision Workflow",
  predictive_insights: "Predictive Insights",
};

/**
 * **Who may flip each switch — and it is not one answer for all four.**
 *
 * The first build of this screen gated the whole route on the wildcard, on the
 * strength of §6.5's *fifth* bullet ("Can view users"). Its **fourth** bullet
 * says the opposite, and the BRD says it four separate times:
 *
 * - §6.5: *"Control access to comments and the decision workflow."*
 * - §4 role table: Super User *"controls comment & decision-workflow access."*
 * - **FR-ADM-06**: *"...control comment & decision-workflow access."* — primary
 *   role **Super User**.
 * - **FR-DASH-03**: *"Allow the Super User to control access to comments and the
 *   decision workflow per role."* — primary role **Super User**.
 *
 * So two of these four are a Super User capability, and locking them behind the
 * wildcard denied a role a requirement grants it three times over.
 *
 * The other two stay Administrator-only, and that is not symmetry-breaking for
 * its own sake: **FR-PA-05** says action assignment is available *"only when the
 * **Administrator** enables the workflow"*, and §6.4 gives the Administrator
 * *"Enable or disable workflow for Supervisor & Management"*. `predictive_insights`
 * has no requirement behind it at all, so it takes the narrower of the two.
 *
 * An Administrator holds `["*"]` and therefore passes every row.
 */
export const WORKFLOW_PERMISSION: Record<WorkflowKey, Permission> = {
  operator_comment_permission: "access:control",
  supervisor_action_workflow: WILDCARD_PERMISSION,
  management_decision_workflow: "access:control",
  predictive_insights: WILDCARD_PERMISSION,
};

export const workflowWireSchema = z.object({
  key: workflowKeySchema,
  enabled: z.boolean(),
  /** The prototype's "Affects:" chip — which role's behaviour changes. */
  affects_role: z.enum(ROLE_VALUES),
});

export const workflowSchema = z.object({
  key: workflowKeySchema,
  enabled: z.boolean(),
  affectsRole: z.enum(ROLE_VALUES),
});

export type WorkflowWire = z.infer<typeof workflowWireSchema>;
export type Workflow = z.infer<typeof workflowSchema>;

export const toWorkflow = (wire: WorkflowWire): Workflow => ({
  key: wire.key,
  enabled: wire.enabled,
  affectsRole: wire.affects_role,
});

export const workflowListResponseSchema = envelopeSchema(
  z.object({ items: z.array(workflowWireSchema) })
);

/** `PATCH /admin/workflows` answers with the single switch it changed. */
export const workflowDetailResponseSchema = envelopeSchema(workflowWireSchema);

export const workflowUpdateSchema = z.object({
  key: workflowKeySchema,
  enabled: z.boolean(),
});

export type WorkflowUpdateValues = z.infer<typeof workflowUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Shift configuration — FR-HOME-03                                            */
/* -------------------------------------------------------------------------- */

/**
 * **FR-HOME-03** — "Define a shift as a 12-hour period (06:00–06:15 overlap);
 * shift boundaries configurable. The Administrator can change shift timings, and
 * report/summary generation aligns to them."
 *
 * `HH:MM`, 24-hour. Not a `datetime` — these are wall-clock boundaries that
 * recur daily, not instants.
 */
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const clockTimeSchema = z
  .string()
  .regex(CLOCK_TIME, "Use 24-hour HH:MM, e.g. 06:00");

export const shiftConfigWireSchema = z.object({
  day_start: clockTimeSchema,
  day_end: clockTimeSchema,
  night_start: clockTimeSchema,
  night_end: clockTimeSchema,
  /** The 06:00–06:15 handover window, in minutes. */
  overlap_minutes: z.number().int().nonnegative(),
});

export const shiftConfigSchema = z.object({
  dayStart: clockTimeSchema,
  dayEnd: clockTimeSchema,
  nightStart: clockTimeSchema,
  nightEnd: clockTimeSchema,
  overlapMinutes: z.number().int().nonnegative(),
});

export type ShiftConfigWire = z.infer<typeof shiftConfigWireSchema>;
export type ShiftConfig = z.infer<typeof shiftConfigSchema>;

export const toShiftConfig = (wire: ShiftConfigWire): ShiftConfig => ({
  dayStart: wire.day_start,
  dayEnd: wire.day_end,
  nightStart: wire.night_start,
  nightEnd: wire.night_end,
  overlapMinutes: wire.overlap_minutes,
});

export const shiftConfigResponseSchema = envelopeSchema(shiftConfigWireSchema);
export const shiftConfigUpdateSchema = shiftConfigWireSchema;

/** Twelve hours, in minutes — the length FR-HOME-03 fixes a shift at. */
const SHIFT_MINUTES = 12 * 60;

/** `"06:00"` → `360`; anything unparseable → `null`. */
const minutesOfDay = (clockTime: string): number | null => {
  const match = CLOCK_TIME.exec(clockTime);
  if (!match) return null;
  const [hours, minutes] = clockTime.split(":");
  return Number(hours) * 60 + Number(minutes);
};

/** Minutes from `from` to `to`, going forward and wrapping past midnight. */
const minutesForward = (from: number, to: number): number =>
  ((to - from) % 1440) + (to < from ? 1440 : 0);

/**
 * **All four boundaries are independently editable, matching the prototype's
 * literal layout (`app-source.txt` 1662–1674).** A prior revision derived
 * three of them from the start time; the owner chose the prototype's editable
 * four-field form instead.
 *
 * FR-HOME-03 still defines a shift as *"a 12-hour period"*, and that is not
 * negotiable just because the fields moved — an independently-set
 * `day 06:00–14:00, night 20:00–04:00` is a shape the requirement does not
 * describe. So the same constraint that used to be enforced *by construction*
 * (deriving the other three) is now enforced *by validation*: submission is
 * refused unless `day_end - day_start` and `night_end - night_start` are both
 * exactly twelve hours, and the night boundary continues from the day
 * boundary with no gap or overlap.
 */
export const shiftTimingsFormSchema = z
  .object({
    dayStart: clockTimeSchema,
    dayEnd: clockTimeSchema,
    nightStart: clockTimeSchema,
    nightEnd: clockTimeSchema,
    overlapMinutes: z
      .number({ message: "Enter a whole number of minutes." })
      .int("Enter a whole number of minutes.")
      .nonnegative("An overlap cannot be negative.")
      // A handover cannot be longer than the shift it hands over.
      // FR-HOME-03's own example is 15 minutes.
      .max(SHIFT_MINUTES, "A handover cannot be longer than the shift itself."),
  })
  .refine(
    (values) => {
      const dayStart = minutesOfDay(values.dayStart);
      const dayEnd = minutesOfDay(values.dayEnd);
      if (dayStart === null || dayEnd === null) return true;
      return minutesForward(dayStart, dayEnd) === SHIFT_MINUTES;
    },
    {
      message: "Day shift must run exactly twelve hours (FR-HOME-03).",
      path: ["dayEnd"],
    }
  )
  .refine((values) => values.dayEnd === values.nightStart, {
    message: "Night shift must start where the day shift ends.",
    path: ["nightStart"],
  })
  .refine(
    (values) => {
      const nightStart = minutesOfDay(values.nightStart);
      const nightEnd = minutesOfDay(values.nightEnd);
      if (nightStart === null || nightEnd === null) return true;
      return minutesForward(nightStart, nightEnd) === SHIFT_MINUTES;
    },
    {
      message: "Night shift must run exactly twelve hours (FR-HOME-03).",
      path: ["nightEnd"],
    }
  )
  .refine((values) => values.nightEnd === values.dayStart, {
    message: "Day shift must start where the night shift ends.",
    path: ["dayStart"],
  });

export type ShiftTimingsFormValues = z.infer<typeof shiftTimingsFormSchema>;

/** camelCase form values → the snake_case wire shape. No derivation left. */
export const toShiftConfigWire = (
  values: ShiftTimingsFormValues
): ShiftConfigWire => ({
  day_start: values.dayStart,
  day_end: values.dayEnd,
  night_start: values.nightStart,
  night_end: values.nightEnd,
  overlap_minutes: values.overlapMinutes,
});

/* -------------------------------------------------------------------------- */
/* Per-user notification permissions — FR-NOT-01                               */
/* -------------------------------------------------------------------------- */

/**
 * **FR-NOT-01** — "Allow the Administrator to control, **per user**, which
 * notifications each user is permitted to view / receive."
 *
 * Keyed by `username`, not by the display name the prototype uses
 * (`state.notifPerm`, app-source.txt 114): a display name is not an identity.
 * The prototype's `[boolean, boolean]` tuple becomes a named
 * `{ in_app, email }` pair — a positional pair of booleans gets read backwards
 * eventually, and this one decides who is told about an overdue safety action.
 */
export const NOTIFICATION_PERMISSION_KEYS = [
  "action_assigned",
  "action_overdue",
  "summary_ready",
  "report_ready",
] as const;

export const notificationPermissionKeySchema = z.enum(
  NOTIFICATION_PERMISSION_KEYS
);
export type NotificationPermissionKey = z.infer<
  typeof notificationPermissionKeySchema
>;

export const NOTIFICATION_PERMISSION_LABEL: Record<
  NotificationPermissionKey,
  string
> = {
  action_assigned: "Action Assigned",
  action_overdue: "Action Overdue",
  summary_ready: "Summary Ready",
  report_ready: "Report Ready",
};

export const channelPermissionSchema = z.object({
  in_app: z.boolean(),
  email: z.boolean(),
});

export type ChannelPermission = z.infer<typeof channelPermissionSchema>;

const permissionMapSchema = z.object({
  action_assigned: channelPermissionSchema,
  action_overdue: channelPermissionSchema,
  summary_ready: channelPermissionSchema,
  report_ready: channelPermissionSchema,
});

export const notificationPermissionWireSchema = z.object({
  username: z.string(),
  display_name: z.string(),
  /** Display-only. Authorization is never decided from a role label. */
  role_label: z.string(),
  permissions: permissionMapSchema,
});

export const notificationPermissionSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  roleLabel: z.string(),
  permissions: permissionMapSchema,
});

export type NotificationPermissionWire = z.infer<
  typeof notificationPermissionWireSchema
>;
export type NotificationPermission = z.infer<
  typeof notificationPermissionSchema
>;

export const toNotificationPermission = (
  wire: NotificationPermissionWire
): NotificationPermission => ({
  username: wire.username,
  displayName: wire.display_name,
  roleLabel: wire.role_label,
  permissions: wire.permissions,
});

export const notificationPermissionListResponseSchema = envelopeSchema(
  paginatedSchema(notificationPermissionWireSchema)
);
export const notificationPermissionDetailResponseSchema = envelopeSchema(
  notificationPermissionWireSchema
);

export const notificationPermissionUpdateSchema = z.object({
  permissions: permissionMapSchema,
});

export type NotificationPermissionUpdateValues = z.infer<
  typeof notificationPermissionUpdateSchema
>;

/* -------------------------------------------------------------------------- */
/* Roles — §6 / FR-ADM-02                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The Roles admin screen (`app-source.txt` 1568–1579, 1613–1630): the five
 * base roles plus §6's Administrator-created custom roles, each mapped to one
 * AD group, with the module permissions and data scope **FR-ADM-02** and
 * §9.1 require.
 *
 * **§9.1 confirms the shape, not the four module names.** The BRD says a
 * custom role gets *"specific module permissions (View, Generate, Approve,
 * Export), data scope (Full Plant or Area-Restricted), and AD-group
 * mapping"* — so the four permission columns and the scope toggle are
 * sourced, not invented. The permission **rows** — `Assistant`, `Summary`,
 * `Actions`, `Reports` — have no BRD enumeration anywhere; they exist only in
 * the prototype's literal table (`roleFormScreen`, line 1625) and are
 * transcribed here as PROVISIONAL, pending owner confirmation that these four
 * (and only these four) are the modules a custom role's permissions apply to.
 *
 * **Area-Restricted carries a live tension this schema does not resolve.**
 * §9.2 says *"all operational roles have full-plant data visibility...
 * Data-level area filtering... is therefore not required."* §9.1 still names
 * `Area-Restricted` as a selectable data scope for a *custom* role, which
 * §9.2 does not carve an exception for. Both are quoted as written; this
 * schema accepts the value because the BRD offers it, and enforcing what it
 * would actually restrict is unspecified and therefore not built.
 *
 * `type` is derived from membership in `ROLE_VALUES` (`constants/roles.ts`)
 * rather than stored twice — a base role is exactly one of the five §6 names;
 * everything else an Administrator creates is custom. The wire still carries
 * it explicitly because the mock seed is the only place that classification
 * is authored, and a real backend answers the same way rather than have every
 * consumer re-derive it.
 */
export const roleTypeSchema = z.enum(["base", "custom"]);
export type RoleType = z.infer<typeof roleTypeSchema>;

export const ROLE_MODULES = [
  "assistant",
  "summary",
  "actions",
  "reports",
] as const;
export const roleModuleSchema = z.enum(ROLE_MODULES);
export type RoleModule = z.infer<typeof roleModuleSchema>;

export const ROLE_MODULE_LABEL: Record<RoleModule, string> = {
  assistant: "Assistant",
  summary: "Summary",
  actions: "Actions",
  reports: "Reports",
};

/** §9.1, verbatim order. */
export const ROLE_PERMISSION_ACTIONS = [
  "view",
  "generate",
  "approve",
  "export",
] as const;
export const rolePermissionActionSchema = z.enum(ROLE_PERMISSION_ACTIONS);
export type RolePermissionAction = z.infer<typeof rolePermissionActionSchema>;

export const ROLE_PERMISSION_ACTION_LABEL: Record<
  RolePermissionAction,
  string
> = {
  view: "View",
  generate: "Generate",
  approve: "Approve",
  export: "Export",
};

const modulePermissionSchema = z.object({
  view: z.boolean(),
  generate: z.boolean(),
  approve: z.boolean(),
  export: z.boolean(),
});

export type ModulePermission = z.infer<typeof modulePermissionSchema>;

const modulePermissionMapSchema = z.object({
  assistant: modulePermissionSchema,
  summary: modulePermissionSchema,
  actions: modulePermissionSchema,
  reports: modulePermissionSchema,
});

export type ModulePermissionMap = z.infer<typeof modulePermissionMapSchema>;

/** Every permission off — the safe starting point for a brand-new custom role. */
export const EMPTY_MODULE_PERMISSIONS: ModulePermissionMap = {
  assistant: { view: false, generate: false, approve: false, export: false },
  summary: { view: false, generate: false, approve: false, export: false },
  actions: { view: false, generate: false, approve: false, export: false },
  reports: { view: false, generate: false, approve: false, export: false },
};

/** §9.1, verbatim. See the tension with §9.2 noted above. */
export const roleDataScopeSchema = z.enum(["full_plant", "area_restricted"]);
export type RoleDataScope = z.infer<typeof roleDataScopeSchema>;

export const ROLE_DATA_SCOPE_LABEL: Record<RoleDataScope, string> = {
  full_plant: "Full plant",
  area_restricted: "Area-restricted",
};

export const roleWireSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Display string from the prototype table, e.g. "24 users" / "1 user". */
  member_count: z.number().int().nonnegative(),
  ad_group: z.string(),
  type: roleTypeSchema,
  permissions: modulePermissionMapSchema,
  data_scope: roleDataScopeSchema,
});

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  memberCount: z.number().int().nonnegative(),
  adGroup: z.string(),
  type: roleTypeSchema,
  permissions: modulePermissionMapSchema,
  dataScope: roleDataScopeSchema,
});

export type RoleWire = z.infer<typeof roleWireSchema>;
export type AdminRole = z.infer<typeof roleSchema>;

export const toAdminRole = (wire: RoleWire): AdminRole => ({
  id: wire.id,
  name: wire.name,
  memberCount: wire.member_count,
  adGroup: wire.ad_group,
  type: wire.type,
  permissions: wire.permissions,
  dataScope: wire.data_scope,
});

export const roleListResponseSchema = envelopeSchema(
  paginatedSchema(roleWireSchema)
);
export const roleDetailResponseSchema = envelopeSchema(roleWireSchema);

/**
 * The New/Edit custom role form (`roleFormScreen`, `app-source.txt`
 * 1613–1630). **"activate immediately"** (FR-ADM-02) is why there is no
 * draft/pending state on the wire — a create or update is live the moment it
 * saves, same as `useUpdateWorkflow`.
 */
export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(60, "Role name must be 60 characters or fewer"),
  permissions: modulePermissionMapSchema,
  dataScope: roleDataScopeSchema,
  adGroup: z.string().min(1, "Choose or create an AD group mapping"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const roleWriteWireSchema = z.object({
  name: z.string().trim().min(2).max(60),
  permissions: modulePermissionMapSchema,
  data_scope: roleDataScopeSchema,
  ad_group: z.string().min(1),
});

export type RoleWriteWire = z.infer<typeof roleWriteWireSchema>;

/** What the form actually sends — camelCase in, snake_case on the wire. */
export const toRoleWriteWire = (values: RoleFormValues): RoleWriteWire =>
  roleWriteWireSchema.parse({
    name: values.name,
    permissions: values.permissions,
    data_scope: values.dataScope,
    ad_group: values.adGroup,
  });
