import type {
  AiConfirmationWire,
  SummaryCommentWire,
  SummarySectionWire,
  SummaryWire,
} from "@/features/summaries/schemas";
import { hoursFromBase } from "@/mocks/data/clock";
import { actor, PEOPLE } from "@/mocks/data/people";

/**
 * `state.summaries` (app-source.txt 91–105) for the list, and `summaryDetail`
 * (1392–1433) for everything a single summary carries.
 *
 * **FR-SUM-01** fixes the four sections — Activities, Critical Alarms, Pending
 * Actions, Safety Observations — and the prototype renders exactly those
 * (1414–1417), so `section.kind` is a closed enum rather than free text.
 *
 * **FR-SUM-06** is why every item carries `record_id`: "attach source references
 * (shift date, timestamp, record ID) to each summary". The prototype prints the
 * record id (`ELB-20250610-0058`) but has no click-through; the id is kept
 * structured here so Phase 1 can link it.
 *
 * Severity replaces the prototype's per-item hex (`'#C0392B'`). The colour is a
 * theme token chosen at render time — no `C`-palette value survives into data.
 *
 * PROVISIONAL field names.
 */

/** `YYYYMMDD`, UTC — the date half of a shift id. */
const dateKey = (date: Date): string =>
  [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("");

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The four FR-SUM-01 sections for the most recent summary. Older summaries reuse
 * them — the prototype only ever authored one detail body, and inventing
 * distinct operational content for thirteen more shifts would be fabricating
 * plant history, not mocking a contract.
 */
const sections = (): SummarySectionWire[] => [
  {
    kind: "activities",
    items: [
      {
        text: "Routine N2 purge completed on Unit 3",
        severity: "low",
        record_id: "ELB-20250610-0058",
      },
      {
        text: "Shift walkdown completed, no abnormal readings",
        severity: "info",
        record_id: "ELB-20250610-0061",
      },
    ],
  },
  {
    kind: "critical_alarms",
    items: [
      {
        text: "B-train compressor trip at 02:14, restarted 02:31",
        severity: "critical",
        record_id: "ELB-20250610-0042",
      },
      {
        text: "P-204 high temperature alarm",
        severity: "high",
        record_id: "ELB-20250610-0051",
      },
    ],
  },
  {
    kind: "pending_actions",
    items: [
      {
        text: "Inspect valve XV-118 (High)",
        severity: "critical",
        record_id: "ELB-20250610-0063",
      },
      {
        text: "Replace P-204 seal (Med)",
        severity: "medium",
        record_id: "ELB-20250610-0052",
      },
    ],
  },
  {
    kind: "safety_observations",
    items: [
      {
        text: "Housekeeping near pump house flagged",
        severity: "low",
        record_id: "ELB-20250610-0066",
      },
    ],
  },
];

const comments = (base: Date): SummaryCommentWire[] => [
  {
    id: "SCM-001",
    author: actor(PEOPLE.OPERATOR),
    body: "Compressor restart confirmed. XV-118 inspection is priority for next shift.",
    created_at: hoursFromBase(-19, base),
  },
  {
    id: "SCM-002",
    author: actor(PEOPLE.MULTI_ROLE),
    body: "P-204 temperature stabilizing, continue monitoring.",
    created_at: hoursFromBase(-18, base),
  },
];

const aiConfirmations = (base: Date): AiConfirmationWire[] => [
  {
    id: "AIC-001",
    suggestion_id: "AI-118",
    title: "Inspect relief valve XV-118",
    confirmed_by: actor(PEOPLE.SUPERVISOR),
    confirmed_at: hoursFromBase(-20, base),
    comment: "High priority, coordinate with maintenance before isolation.",
  },
  {
    id: "AIC-002",
    suggestion_id: "AI-204",
    title: "Monitor P-204 temperature over next shift",
    confirmed_by: actor(PEOPLE.SUPERVISOR),
    confirmed_at: hoursFromBase(-19, base),
    comment: "Continue monitoring for 24 h.",
  },
];

/** Who generated which summary, cycling so the list is not one author deep. */
const AUTHORS: readonly { username: string; role: string }[] = [
  { username: PEOPLE.OPERATOR, role: "Operator" },
  { username: PEOPLE.MULTI_ROLE, role: "Operator" },
  { username: PEOPLE.SUPERVISOR, role: "Supervisor" },
  { username: PEOPLE.MANAGEMENT, role: "Management" },
];

const SUMMARY_COUNT = 14;
const SHIFT_HOURS = 12;

/**
 * Fourteen summaries — one per shift over the last week, newest first —
 * generated from the seed instant rather than frozen in June 2026. Only the
 * newest carries a full body; the rest are list rows until a backend has real
 * ones, and the detail handler falls back to the same sections.
 */
export const seedSummaries = (base: Date): SummaryWire[] =>
  Array.from({ length: SUMMARY_COUNT }, (_, index) => {
    const generatedAt = new Date(
      base.getTime() - index * SHIFT_HOURS * 60 * 60 * 1000
    );
    // Even index is the most recent shift; alternate Day/Night going back.
    const isDay = index % 2 === 0;
    const author = AUTHORS[index % AUTHORS.length] ?? AUTHORS[0];

    return {
      id: `SUM-${dateKey(generatedAt)}-${isDay ? "D" : "N"}`,
      shift_id: `${dateKey(generatedAt)}-${isDay ? "D" : "N"}`,
      name: `${isDay ? "Day" : "Night"} Shift – ${DATE_LABEL.format(generatedAt)}`,
      window_label: isDay ? "Day (06:00–18:00)" : "Night (18:00–06:00)",
      shift_date: dateKey(generatedAt),
      generated_at: hoursFromBase(-index * SHIFT_HOURS, base),
      generated_by: actor(author.username),
      generated_by_role: author.role,
      generation: index === 0 ? "on_demand" : "end_of_shift",
      sections: sections(),
      comments: index === 0 ? comments(base) : [],
      ai_confirmations: index === 0 ? aiConfirmations(base) : [],
    };
  });
