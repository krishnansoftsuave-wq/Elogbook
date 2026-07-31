import { ROLE_LABEL, type Role } from "@/constants/roles";
import {
  NOTIFICATION_PERMISSION_KEYS,
  type ChannelPermission,
  type NotificationPermissionKey,
  type NotificationPermissionWire,
  type ShiftConfigWire,
  type WorkflowWire,
} from "@/features/admin/schemas";
import { rolesForGroups } from "@/lib/auth/permissions";
import { findMockAccount } from "@/mocks/auth/directory";
import { PEOPLE, SEEDABLE_PEOPLE } from "@/mocks/data/people";
import {
  SHIFT_OVERLAP_MINUTES,
  SHIFT_START_HOUR,
} from "@/mocks/shifts/constants";

/* -------------------------------------------------------------------------- */
/* Workflow toggles — FR-PA-05, FR-SUM-08, FR-ADM-06                           */
/* -------------------------------------------------------------------------- */

/**
 * The four Administrator switches, from `adminWorkflows` (app-source.txt
 * 1987–2006).
 *
 * **Every one seeds `false`, and that is a correction to the prototype's state,
 * not to its design.** The prototype's own cards print *"When disabled
 * (default)"* and a `Default: OFF` chip on all four (2001, 2003–2006), while
 * `state` initialises three of them `true` (lines 86, 113). The BRD agrees with
 * the cards, not the state:
 *
 * - **FR-PA-05** — assignment, tracking, update and closure are available "only
 *   when the Administrator enables the workflow; supervisors do not assign tasks
 *   to operators by default".
 * - **§6.2(a)**, the labelled default — "no task is assigned to operators and
 *   there is no escalation step".
 * - **§6.3(a)** — Management "record[s] the risk and the decision for future
 *   reference — no workflow is triggered".
 * - **FR-SUM-08** — comment access on a summary is controlled by Admin/Super
 *   User, i.e. granted, not assumed.
 *
 * So this is not the BRD overruling the prototype; it is the prototype's seed
 * data being out of step with the prototype's own copy. Both point the same way.
 */
export const seedWorkflows = (): WorkflowWire[] => [
  {
    key: "operator_comment_permission",
    enabled: false,
    affects_role: "operator",
  },
  {
    key: "supervisor_action_workflow",
    enabled: false,
    affects_role: "supervisor",
  },
  {
    key: "management_decision_workflow",
    enabled: false,
    affects_role: "management",
  },
  { key: "predictive_insights", enabled: false, affects_role: "management" },
];

/* -------------------------------------------------------------------------- */
/* Shift configuration — FR-HOME-03                                            */
/* -------------------------------------------------------------------------- */

/**
 * `adminConfig` (app-source.txt 2014–2018): day 06:00–18:00, night 18:00–06:00,
 * 15-minute handover overlap. FR-HOME-03 makes these Administrator-configurable
 * and says "report/summary generation aligns to them".
 *
 * The values are read from `mocks/shifts/constants.ts` rather than retyped, so
 * the admin screen and `GET /shifts/current` cannot disagree about what a shift
 * is. These are the **defaults**; the stored row is what the boundary actually
 * follows.
 *
 * **Wired as of Phase 3b.** `currentShift(at, config)` takes this row, so saving
 * a new start hour on `/admin/shift-config` genuinely moves the live boundary —
 * which is what FR-HOME-03's "report/summary generation aligns to them" asks
 * for. The times are **plant-local** (`Asia/Muscat`); `constants.ts` records why
 * reading them as UTC was a defect.
 */
const pad = (value: number): string => value.toString().padStart(2, "0");

const NIGHT_START_HOUR = (SHIFT_START_HOUR + 12) % 24;

export const seedShiftConfig = (): ShiftConfigWire => ({
  day_start: `${pad(SHIFT_START_HOUR)}:00`,
  day_end: `${pad(NIGHT_START_HOUR)}:00`,
  night_start: `${pad(NIGHT_START_HOUR)}:00`,
  night_end: `${pad(SHIFT_START_HOUR)}:00`,
  overlap_minutes: SHIFT_OVERLAP_MINUTES,
});

/* -------------------------------------------------------------------------- */
/* Per-user notification permissions — FR-NOT-01                               */
/* -------------------------------------------------------------------------- */

/**
 * `state.notifPerm` (app-source.txt 114) and the matrix that edits it
 * (`adminNotifPerm`, 2022–2041). FR-NOT-01: "Allow the Administrator to control,
 * **per user**, which notifications each user is permitted to view / receive."
 *
 * Two translations:
 *
 * - The prototype keys by display name (`'A. Harthy'`) and stores each cell as a
 *   bare `[boolean, boolean]` tuple. Keyed by `username` here — a display name
 *   is not an identity — and the pair is named `in_app`/`email`, because a
 *   positional tuple is exactly the kind of thing that gets read backwards once.
 * - The prototype's ten rows include `Unit Manager` and `HSSE Officer`. BRD §6.6
 *   does name those as baseline read-only roles, but `src/constants/roles.ts`
 *   has no constant for them and no AD group maps to them, so seeding them would
 *   mean inventing a role. Six rows, one per real `MOCK_ACCOUNTS` identity, and
 *   the §6.6 gap stays flagged rather than papered over.
 */
/** Which notifications a role plausibly cares about, before the Admin edits it. */
const DEFAULTS_BY_ROLE: Record<
  string,
  Record<NotificationPermissionKey, ChannelPermission>
> = {
  operator: {
    action_assigned: { in_app: true, email: false },
    action_overdue: { in_app: true, email: false },
    summary_ready: { in_app: false, email: false },
    report_ready: { in_app: false, email: false },
  },
  supervisor: {
    action_assigned: { in_app: true, email: false },
    action_overdue: { in_app: true, email: true },
    summary_ready: { in_app: true, email: false },
    report_ready: { in_app: false, email: false },
  },
  management: {
    action_assigned: { in_app: false, email: false },
    action_overdue: { in_app: false, email: false },
    summary_ready: { in_app: true, email: true },
    report_ready: { in_app: true, email: true },
  },
  administrator: {
    action_assigned: { in_app: true, email: true },
    action_overdue: { in_app: true, email: true },
    summary_ready: { in_app: true, email: true },
    report_ready: { in_app: true, email: true },
  },
  super_user: {
    action_assigned: { in_app: false, email: false },
    action_overdue: { in_app: false, email: false },
    summary_ready: { in_app: true, email: false },
    report_ready: { in_app: true, email: false },
  },
};

const ALL_OFF: Record<NotificationPermissionKey, ChannelPermission> = {
  action_assigned: { in_app: false, email: false },
  action_overdue: { in_app: false, email: false },
  summary_ready: { in_app: false, email: false },
  report_ready: { in_app: false, email: false },
};

/**
 * FR-AUTH-03: a multi-role account gets the union, so the first role alone would
 * under-report what Maryam Al-Zadjali (Operator + Management) may receive.
 * Read-only defaults, so an OR across roles is the faithful reading.
 */
const defaultsFor = (
  roles: readonly Role[]
): Record<NotificationPermissionKey, ChannelPermission> => {
  const merged = structuredClone(ALL_OFF);

  for (const role of roles) {
    const table = DEFAULTS_BY_ROLE[role];
    if (!table) continue;
    for (const key of NOTIFICATION_PERMISSION_KEYS) {
      merged[key] = {
        in_app: merged[key].in_app || table[key].in_app,
        email: merged[key].email || table[key].email,
      };
    }
  }

  return merged;
};

export const seedNotificationPermissions = (): NotificationPermissionWire[] =>
  SEEDABLE_PEOPLE.map((username) => {
    const account = findMockAccount(username);
    if (!account) {
      throw new Error(`Unknown account in notification seed: ${username}`);
    }

    const roles = rolesForGroups(account.groups);

    return {
      username: account.username,
      display_name: account.displayName,
      role_label: roles.map((role) => ROLE_LABEL[role] ?? role).join(" · "),
      permissions: defaultsFor(roles),
    };
  });

/** Exported for the seed test, which asserts the administrator row is complete. */
export const ADMINISTRATOR_USERNAME = PEOPLE.ADMINISTRATOR;
