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

/**
 * **Two fields are editable; the other three follow.**
 *
 * FR-HOME-03 defines a shift as *"a 12-hour period"*, so once the day shift's
 * start is known, its end and both night boundaries are arithmetic. The
 * prototype (`app-source.txt` 2016) draws four independently editable free-text
 * time inputs — the named deviation, because independent boundaries would permit
 * `day 06:00–14:00, night 20:00–04:00`, a shape the requirement does not
 * describe and the shift arithmetic cannot represent.
 *
 * The wire object keeps all five fields. The form derives three of them on
 * submit, so the contract is unchanged and only the *editing* is narrowed.
 */
export const shiftTimingsFormSchema = z.object({
  dayStart: clockTimeSchema,
  overlapMinutes: z
    .number({ message: "Enter a whole number of minutes." })
    .int("Enter a whole number of minutes.")
    .nonnegative("An overlap cannot be negative.")
    // Derived, not invented: a handover cannot be longer than the shift it
    // hands over. FR-HOME-03's own example is 15 minutes.
    .max(SHIFT_MINUTES, "A handover cannot be longer than the shift itself."),
});

export type ShiftTimingsFormValues = z.infer<typeof shiftTimingsFormSchema>;

/** `"06:00"` → `360`; anything unparseable → `null`. */
const minutesOfDay = (clockTime: string): number | null => {
  const match = CLOCK_TIME.exec(clockTime);
  if (!match) return null;
  const [hours, minutes] = clockTime.split(":");
  return Number(hours) * 60 + Number(minutes);
};

const clockTimeOf = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

/**
 * The full five-field wire object from the two the form owns.
 *
 * Shared by the form's preview and its submit so the read-only fields on screen
 * are, provably, the values that get sent — a second implementation of "add
 * twelve hours" is how the preview and the payload drift apart.
 */
export const deriveShiftConfig = (
  values: ShiftTimingsFormValues
): ShiftConfigWire => {
  const startMinutes = minutesOfDay(values.dayStart) ?? 0;
  const nightStart = clockTimeOf(startMinutes + SHIFT_MINUTES);

  return {
    day_start: clockTimeOf(startMinutes),
    day_end: nightStart,
    night_start: nightStart,
    night_end: clockTimeOf(startMinutes),
    overlap_minutes: values.overlapMinutes,
  };
};

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
