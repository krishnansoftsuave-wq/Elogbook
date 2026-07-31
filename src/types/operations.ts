import { z } from "zod";

/**
 * Vocabulary shared by pending actions, AI suggestions and risk decisions. It
 * lives here rather than in one feature because three features spell the same
 * priority scale, and a second copy is how two of them drift apart.
 *
 * PROVISIONAL — the *values* are derived from the NYX prototype's mock state
 * (`app-source.txt` 34, 41–60) and stand until the backend contract confirms
 * them. What is NOT provisional is the spelling convention: wire values are
 * lowercase snake_case tokens (`in_progress`), never the display string. `GET
 * /me` already spells its enums that way (`roles: ["operator"]`), and a wire
 * value that *is* the English label cannot be translated — NFR-07 makes Arabic
 * first-class, so the label has to be a frontend lookup. That is a deliberate
 * deviation from the prototype, which stores `'In Progress'` directly in state.
 */

/** `PRICOL`, app-source.txt line 34 — severity order, most severe first. */
export const PRIORITY_VALUES = ["critical", "high", "medium", "low"] as const;

export const prioritySchema = z.enum(PRIORITY_VALUES);
export type Priority = z.infer<typeof prioritySchema>;

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * BRD **FR-PA-04**, verbatim and in order: "Move actions through Open, In
 * Progress, On Hold, Completed, Cancelled, Verified."
 *
 * The prototype's `state.actions` uses a five-value set that omits `Cancelled`
 * and `Verified` and adds `Overdue` (app-source.txt 41–54). The BRD wins over
 * the prototype, and it is not even a real disagreement: the prototype's own
 * admin copy quotes this exact six-state lifecycle back (app-source.txt 2004),
 * so only its seed data is out of step.
 *
 * `Overdue` is deliberately absent. **FR-PA-06** calls for *flagging* overdue
 * actions, which makes it a derived property of due date and status — see
 * `isActionOverdue`. Modelling it as a status would make an action stop being
 * `open` the moment its due date passed, and there would be no way back.
 */
export const ACTION_STATUS_VALUES = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
  "verified",
] as const;

export const actionStatusSchema = z.enum(ACTION_STATUS_VALUES);
export type ActionStatus = z.infer<typeof actionStatusSchema>;

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  verified: "Verified",
};

/** Statuses that take an action out of play, so it can no longer run overdue. */
const CLOSED_STATUSES: readonly ActionStatus[] = [
  "completed",
  "cancelled",
  "verified",
];

export const isClosedStatus = (status: ActionStatus): boolean =>
  CLOSED_STATUSES.includes(status);

/**
 * ISO-8601 with an explicit offset or `Z` — the only spelling `due_at` is
 * contracted to carry.
 *
 * Testing this before `Date.parse` is load-bearing, not belt-and-braces.
 * `Date.parse` is permitted to accept implementation-specific formats, and V8
 * reads the prototype's own `'14 Jun 16:00'` as *June 14th of the current year*.
 * A date that carries no year would therefore resolve to a real instant, land in
 * the past for half of every year, and silently flag a live safety action as
 * overdue — with nothing in the data to show why. Anything that is not
 * unambiguously ISO is treated as "no usable due date" instead.
 */
const ISO_8601_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * **FR-PA-06**'s overdue flag, derived rather than stored.
 *
 * `at` is injected so a caller can ask the question about a point in time other
 * than now — which is what makes this testable without freezing the clock.
 */
export const isActionOverdue = (
  dueAt: string,
  status: ActionStatus,
  at: Date = new Date()
): boolean => {
  if (isClosedStatus(status)) return false;

  // Not a usable due date is not evidence of lateness. FR-AN-06 leaves counting
  // definitions unconfirmed, and the prototype itself carries a "No due date —
  // unparsed, needs review" bucket (app-source.txt 1925).
  if (!ISO_8601_INSTANT.test(dueAt)) return false;

  const due = Date.parse(dueAt);
  if (Number.isNaN(due)) return false;

  return due < at.getTime();
};

/**
 * Where an action came from. `ai_suggested` is the one that matters downstream:
 * FR-PA-02 has a Supervisor confirm those specifically, and FR-PA-01 splits
 * capture into "manual tagging and automatic AI extraction".
 */
export const ACTION_SOURCE_VALUES = [
  "ai_suggested",
  "handover",
  "manual",
  "alarm",
  "safety_observation",
] as const;

export const actionSourceSchema = z.enum(ACTION_SOURCE_VALUES);
export type ActionSource = z.infer<typeof actionSourceSchema>;

export const ACTION_SOURCE_LABEL: Record<ActionSource, string> = {
  ai_suggested: "AI Suggested",
  handover: "Handover",
  manual: "Manual",
  alarm: "Alarm",
  safety_observation: "Safety Observation",
};

export const ACTION_CATEGORY_VALUES = [
  "safety",
  "maintenance",
  "process",
  "environmental",
  "operational",
] as const;

export const actionCategorySchema = z.enum(ACTION_CATEGORY_VALUES);
export type ActionCategory = z.infer<typeof actionCategorySchema>;

export const ACTION_CATEGORY_LABEL: Record<ActionCategory, string> = {
  safety: "Safety",
  maintenance: "Maintenance",
  process: "Process",
  environmental: "Environmental",
  operational: "Operational",
};

/**
 * Plant areas, as free text rather than an enum.
 *
 * The prototype uses four (`B-train`, `Unit 3`, `Utilities`, and `—` for
 * "none"), but BRD §6.2 has the Administrator set data scope per Supervisor
 * sub-category "(area, unit or train)" — an Admin-configurable list. Closing it
 * into an enum would fail the parse for any area OLNG adds after this build
 * shipped, which is the same trap `meDataSchema` avoids for roles.
 */
export const areaSchema = z.string();

/** The prototype writes an em dash where a record has no equipment tag. */
export const NO_EQUIPMENT = "—";
