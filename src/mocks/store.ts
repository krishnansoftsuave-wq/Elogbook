import { roleLabel } from "@/constants/roles";
import type {
  ActionCommentWire,
  ActionWire,
  SuggestionWire,
} from "@/features/actions/schemas";
import type {
  NotificationPermissionWire,
  RoleWire,
  ShiftConfigWire,
  WorkflowKey,
  WorkflowWire,
} from "@/features/admin/schemas";
import type { AssistantFeedbackWire } from "@/features/assistant/schemas";
import type { AuditAction, AuditEventWire } from "@/features/audit/schemas";
import type {
  DashboardConfigWire,
  DashboardVersionWire,
  LibraryWidgetWire,
} from "@/features/dashboard-builder/schemas";
import type {
  DashboardLayoutEntryWire,
  DashboardWidgetWire,
} from "@/features/dashboards/schemas";
import type { DecisionWire } from "@/features/decisions/schemas";
import type { NotificationWire } from "@/features/notifications/schemas";
import type { RequestWire } from "@/features/requests/schemas";
import type { SummaryWire } from "@/features/summaries/schemas";
import type { UserWire } from "@/types/user";
import {
  seedActionComments,
  seedActions,
  seedSuggestions,
} from "@/mocks/data/actions";
import {
  seedNotificationPermissions,
  seedRoles,
  seedShiftConfig,
  seedWorkflows,
} from "@/mocks/data/admin";
import { seedAuditEvents } from "@/mocks/data/audit";
import {
  seedDashboardConfigs,
  seedDashboardVersions,
  seedLibraryWidgets,
} from "@/mocks/data/dashboard-builder";
import { seedDashboardWidgets } from "@/mocks/data/dashboards";
import { seedDecisions } from "@/mocks/data/decisions";
import { seedNotifications } from "@/mocks/data/notifications";
import { seedRequests } from "@/mocks/data/requests";
import { seedSummaries } from "@/mocks/data/summaries";
import { seedUsers } from "@/mocks/data/users";

/**
 * The mock backend's database.
 *
 * **Why this exists at all.** Route handlers are stateless per request, so
 * without somewhere to put a write, a mutation could only be faked in the Query
 * cache — and then `invalidateQueries` would refetch the untouched fixture and
 * the UI would visibly revert. Mark an action Completed, watch the row snap back
 * to Open. Avoiding that revert means dropping the invalidation and treating
 * `setQueryData` as the source of truth, which is exactly the code that gets
 * deleted when the real backend lands. A mutable store keeps every mutation hook
 * honest: mutate → invalidate → refetch → new value, the same sequence the real
 * API will drive.
 *
 * **Why `globalThis`.** A module-level `let` is re-initialised whenever the dev
 * server re-evaluates this module, which HMR does on any edit anywhere in its
 * import graph — losing the demo's state mid-demo. Pinning the instance on
 * `globalThis` (the Prisma-client pattern) survives module re-evaluation. A full
 * `next dev` restart still reseeds, which is fine: the seed is deterministic
 * apart from its time base.
 *
 * **Scope.** One instance per Node process, shared by every request and every
 * signed-in browser. For a handover demo that is the right behaviour — the
 * Supervisor confirms an action and the Operator's screen reflects it.
 *
 * **Not durable.** Nothing touches disk. A file-backed store would be a second
 * persistence layer drifting from the fixtures in git, and it would need its own
 * migration story for a thing that is deleted at cutover.
 */
export interface MockStoreData {
  actions: ActionWire[];
  actionComments: ActionCommentWire[];
  suggestions: SuggestionWire[];
  summaries: SummaryWire[];
  notifications: NotificationWire[];
  decisions: DecisionWire[];
  requests: RequestWire[];
  workflows: WorkflowWire[];
  shiftConfig: ShiftConfigWire;
  notificationPermissions: NotificationPermissionWire[];
  /** §6 / FR-ADM-02 — base roles plus Administrator-created custom roles. */
  roles: RoleWire[];
  auditEvents: AuditEventWire[];
  dashboardWidgets: DashboardWidgetWire[];
  /**
   * ⚠️ PROTOTYPE-ONLY, like the feature that reads it
   * (`features/dashboard-builder/schemas.ts`) — no BRD basis. One entity per
   * role's dashboard, distinct from `dashboardWidgets`'s single shared
   * catalog above.
   */
  dashboardConfigs: DashboardConfigWire[];
  dashboardVersions: DashboardVersionWire[];
  dashboardLibrary: LibraryWidgetWire[];
  /**
   * **FR-DASH-05** — personalisation "does not affect the standard dashboard
   * configured for other users". Keyed by username for exactly that reason:
   * one user's saved layout is unreachable from another's request, which is a
   * property of the shape rather than of the handler remembering to filter.
   *
   * Seeded empty. An absent entry means "no personalisation", which is the
   * correct starting state — every user begins on their role's standard layout
   * (FR-DASH-01) until they change it.
   */
  dashboardLayouts: Record<string, DashboardLayoutEntryWire[]>;
  /**
   * FR-FB-01 capture. Seeded empty on purpose — feedback is a record of what a
   * real user thought, and fabricating a few thumbs-downs would put invented
   * opinions into a store whose whole job is to stand in for facts.
   */
  assistantFeedback: AssistantFeedbackWire[];
  /**
   * FR-ADM-01's directory, projected from `MOCK_ACCOUNTS`. Mutable because
   * `status` is the platform's own field; `display_name`, `ad_groups` and
   * `roles` are AD's and no handler writes them.
   */
  users: UserWire[];
}

/**
 * Every fixture's timestamps are relative to one instant, captured once per
 * seed. Taking `new Date()` per entity would let a slow seed spread its records
 * across a boundary and make "12 hours ago" mean two different things in two
 * collections.
 */
const buildSeed = (): MockStoreData => {
  const base = new Date();

  return {
    actions: seedActions(base),
    actionComments: seedActionComments(base),
    suggestions: seedSuggestions(),
    summaries: seedSummaries(base),
    notifications: seedNotifications(base),
    decisions: seedDecisions(base),
    requests: seedRequests(base),
    workflows: seedWorkflows(),
    shiftConfig: seedShiftConfig(),
    notificationPermissions: seedNotificationPermissions(),
    roles: seedRoles(),
    auditEvents: seedAuditEvents(base),
    dashboardWidgets: seedDashboardWidgets(),
    dashboardConfigs: seedDashboardConfigs(base),
    dashboardVersions: seedDashboardVersions(base),
    dashboardLibrary: seedLibraryWidgets(),
    dashboardLayouts: {},
    assistantFeedback: [],
    users: seedUsers(),
  };
};

/**
 * Declared on `globalThis` rather than cast onto it.
 *
 * A `globalThis as unknown as Holder` cast is the usual shortcut here, and this
 * repo's ESLint bans `as` outright — correctly, since a cast is exactly how an
 * unvalidated shape gets waved through. A global declaration says the same thing
 * to the compiler with no escape hatch, and `var` is required by the
 * `declare global` syntax (`let`/`const` do not create properties on
 * `globalThis`).
 */
declare global {
  var __elogbookMockStore: MockStoreData | undefined;
}

/** The live store. Mutate what it returns — that is the point of it. */
export const mockStore = (): MockStoreData => {
  globalThis.__elogbookMockStore ??= buildSeed();
  return globalThis.__elogbookMockStore;
};

/**
 * Back to the seeded state.
 *
 * Required in `beforeEach` of any test that writes. Route handler tests import
 * the handlers directly and share one process, so without this a test that
 * completes ACT-2041 leaks into the next test that expects it open. That is the
 * one discipline the mutable-store choice costs, and it is cheap.
 */
export const resetMockStore = (): void => {
  globalThis.__elogbookMockStore = buildSeed();
};

/* -------------------------------------------------------------------------- */
/* Write helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Applies a patch to the record with `id` and returns the updated copy, or
 * `null` when there is no such record — which is the handler's 404 signal.
 *
 * Replaces the element rather than mutating it in place. An in-place mutation
 * would be invisible to anything holding a reference to the old object, and it
 * makes "what did this request change" impossible to see in a test.
 *
 * **NFR-12** (no lost updates or duplicates under concurrency): last write wins
 * per field, applied atomically within the request. Real optimistic-concurrency
 * control — an `If-Match` / version column — is **[BACKEND]**; this proves the
 * frontend re-reads after writing rather than assuming its own copy is current.
 */
export const patchById = <TRecord extends { id: string }>(
  collection: TRecord[],
  id: string,
  patch: Partial<TRecord>
): TRecord | null => {
  const index = collection.findIndex((record) => record.id === id);
  const existing = collection[index];
  if (!existing) return null;

  // `Object.assign` rather than a spread: spreading a generic yields
  // `TRecord & Partial<TRecord>`, which TypeScript will not narrow back to
  // `TRecord` without a cast, and casts are banned here for good reason.
  const updated: TRecord = Object.assign({}, existing, patch);
  collection[index] = updated;
  return updated;
};

export const findById = <TRecord extends { id: string }>(
  collection: readonly TRecord[],
  id: string
): TRecord | null => collection.find((record) => record.id === id) ?? null;

/**
 * Append-only, per FR-ADM-05 and FR-OBS-01. There is deliberately no update or
 * delete counterpart: the guarantee is [BACKEND], but the frontend must never be
 * written as though editing an audit row were possible.
 */
export const appendAuditEvent = (event: AuditEventWire): void => {
  mockStore().auditEvents.push(event);
};

/**
 * Records what a session just did.
 *
 * **FR-ADM-05** wants "sign-ins, approvals, AI questions, exports, and settings
 * changes" captured, and **FR-REP-06** wants *every* export audited. Calling
 * this from each mutating handler is what makes the Phase 3 audit screen show
 * something real rather than a frozen fixture — click through the demo and the
 * log fills up.
 *
 * `roles` is display-only here (`meDataSchema` keeps it an open `string[]`
 * because a custom role can carry a name this build never heard of), so the
 * label falls back to the raw value rather than indexing blindly.
 */
export const recordAudit = (
  session: { username: string; display_name: string; roles: string[] },
  action: AuditAction,
  target: string,
  result: "success" | "failure" = "success"
): void => {
  recordAuditFor(
    {
      username: session.username,
      display_name: session.display_name,
    },
    session.roles.map(roleLabel).join(" · "),
    action,
    target,
    result
  );
};

/**
 * The same record, for an event with **no resolved session** — a sign-in that
 * was refused.
 *
 * `recordAudit` above cannot express this: it derives the actor and the role
 * label from a session, and a refused sign-in has neither. **FR-ADM-05** and
 * **§9.3** both name sign-ins *first* among what the trail must carry, and a
 * failed one is what somebody opens an audit log to find — so the attempted
 * username is recorded even though no role resolved, and `actor` goes null only
 * when the request never named one.
 *
 * `auditEventWireSchema.actor` has always been `.nullable()` for the seed's
 * `RETENTION_PURGE` row; this is the second thing that needs it.
 */
export const recordAuditFor = (
  actor: { username: string; display_name: string } | null,
  roleLabelText: string,
  action: AuditAction,
  target: string,
  result: "success" | "failure" = "success"
): void => {
  appendAuditEvent({
    id: nextId("AUD"),
    occurred_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    actor,
    role_label: roleLabelText,
    action,
    target,
    result,
  });
};

/**
 * Newest shift first — the one definition of "latest summary", used by both
 * `GET /summaries` and the confirmation handler.
 *
 * **Shared because they drifted apart once.** `GET /summaries` sorted while
 * `POST /suggestions/:id/confirm` took `summaries[0]`, so a confirmation could
 * attach to a record no screen was showing. One comparator, two callers.
 *
 * **By `shift_date` only, and the tie is deliberate.** `shift_id` is
 * `YYYYMMDD-<D|N>`, and comparing the whole thing sorts `-N` above `-D` within
 * a date — which asserts that the night shift *follows* the day shift. The seed
 * cannot support that: it steps back 12 hours per row from the seed instant, so
 * **which half of the day shares a date with which flips depending on the hour
 * the store was built**. Rather than invent a D/N chronology the data does not
 * have, this compares the date and leaves same-date records in insertion order —
 * which is strictly newest-first by construction, and which
 * `Array.prototype.sort` has been required to preserve since ES2019.
 *
 * What it does fix is the case that prompted the sort: `POST /summaries`
 * prepends a summary for whatever shift was asked for, so generating one for a
 * 2020 shift used to float it to the top of every list and onto the dashboard.
 * A date comparison puts it where it belongs.
 */
export const latestSummaryFirst = <T extends { shift_date: string }>(
  a: T,
  b: T
): number => b.shift_date.localeCompare(a.shift_date);

/** Monotonic per process — enough to keep generated ids unique within a demo. */
let sequence = 0;

export const nextId = (prefix: string): string => {
  sequence += 1;
  return `${prefix}-${sequence.toString().padStart(4, "0")}`;
};

/** Whether an Administrator has switched a workflow on (FR-PA-05, FR-SUM-08). */
export const isWorkflowEnabled = (key: WorkflowKey): boolean =>
  mockStore().workflows.find((workflow) => workflow.key === key)?.enabled ??
  false;
