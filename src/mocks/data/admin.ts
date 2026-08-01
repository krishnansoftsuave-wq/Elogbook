import { ROLE_LABEL, type Role } from "@/constants/roles";
import {
  NOTIFICATION_PERMISSION_KEYS,
  type ChannelPermission,
  type NotificationPermissionKey,
  type NotificationPermissionWire,
  type RoleWire,
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

/* -------------------------------------------------------------------------- */
/* Roles — §6 / FR-ADM-02                                                     */
/* -------------------------------------------------------------------------- */

/** Every module permission on — what "the platform's own access model" means for a base role. */
const FULL_PERMISSIONS: RoleWire["permissions"] = {
  assistant: { view: true, generate: true, approve: true, export: true },
  summary: { view: true, generate: true, approve: true, export: true },
  actions: { view: true, generate: true, approve: true, export: true },
  reports: { view: true, generate: true, approve: true, export: true },
};

/** View-only everywhere — `roleFormScreen`'s own checkbox default (line 1625). */
const VIEW_ONLY_PERMISSIONS: RoleWire["permissions"] = {
  assistant: { view: true, generate: false, approve: false, export: false },
  summary: { view: true, generate: false, approve: false, export: false },
  actions: { view: true, generate: false, approve: false, export: false },
  reports: { view: true, generate: false, approve: false, export: false },
};

/**
 * The Roles admin table (`app-source.txt` 1569), transcribed row for row: the
 * five base roles §6 defines, plus §6.1's Unit Manager and §6.6's Shutdown
 * Coordinator and HSSE Officer baseline (all real, `roleLabel`-covered roles
 * with no `ROLES` constant or AD group of their own yet — see
 * `constants/roles.ts`), then the three Administrator-created custom roles the
 * prototype seeds.
 *
 * **Shutdown Coordinator is `base`, not `custom`.** §6 line 161 says base
 * roles "ship out of the box, including Unit Manager, Shutdown Coordinator and
 * HSSE Officer", and §6.6 titles all three together as additional baseline
 * roles. Seeding it `custom` made a BRD-mandated role deletable and its AD
 * group editable (`api/v1/admin/roles/[id]/route.ts` :56, :92) — the two
 * behaviours `type` actually governs.
 *
 * `member_count` is transcribed as the prototype's own number, not derived
 * from `MOCK_ACCOUNTS` — that directory seeds six identities total, nowhere
 * near "24 users", because it exists to prove sign-in, not to be a census.
 *
 * `permissions`/`data_scope` have no prototype source for these ten rows —
 * `roleFormScreen` only ever edits a *new* role. Base roles seed full
 * permissions, full plant, matching what §9.1 gives an Administrator via the
 * wildcard; the four custom roles seed the form's own View-only default,
 * full plant (§9.2), since nothing records what an Administrator actually
 * granted them when the prototype's demo data was authored.
 */
export const seedRoles = (): RoleWire[] => [
  {
    id: "ROLE-0001",
    name: "Operator",
    member_count: 24,
    ad_group: "ELOGBOOK_OPERATOR",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0002",
    name: "Supervisor",
    member_count: 6,
    ad_group: "ELOGBOOK_SUPERVISOR",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0003",
    name: "Management",
    member_count: 3,
    ad_group: "ELOGBOOK_MGMT",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0004",
    name: "Administrator",
    member_count: 2,
    ad_group: "ELOGBOOK_ADMIN",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0005",
    name: "HSSE Officer",
    member_count: 2,
    ad_group: "ELOGBOOK_HSSE",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0006",
    name: "Unit Manager",
    member_count: 3,
    ad_group: "ELOGBOOK_UNITMGR",
    type: "base",
    permissions: FULL_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0007",
    name: "Shutdown Coordinator",
    member_count: 1,
    ad_group: "ELOGBOOK_SHUTDOWN",
    type: "base",
    permissions: VIEW_ONLY_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0008",
    name: "Turnaround Lead",
    member_count: 1,
    ad_group: "ELOGBOOK_TA_LEAD",
    type: "custom",
    permissions: VIEW_ONLY_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0009",
    name: "Contractor (Read-only)",
    member_count: 5,
    ad_group: "ELOGBOOK_CONTRACTOR",
    type: "custom",
    permissions: VIEW_ONLY_PERMISSIONS,
    data_scope: "full_plant",
  },
  {
    id: "ROLE-0010",
    name: "Reliability Engineer",
    member_count: 2,
    ad_group: "ELOGBOOK_RELIABILITY",
    type: "custom",
    permissions: VIEW_ONLY_PERMISSIONS,
    data_scope: "full_plant",
  },
];
