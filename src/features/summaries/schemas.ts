import { z } from "zod";

import { envelopeSchema, paginatedSchema } from "@/lib/zod";
import { actorSchema, actorWireSchema, toActor } from "@/types/actor";

/**
 * Shift summaries — BRD §7.5.
 *
 * PROVISIONAL field names, derived from `app-source.txt` 91–105 (list) and
 * 1392–1433 (detail). The envelope is not provisional.
 */

/**
 * **FR-SUM-01**, verbatim: summaries cover "Activities, Critical Alarms, Pending
 * Actions, Safety Observations, per the OLNG template". A closed enum, because
 * the requirement names exactly four and the prototype renders exactly four.
 *
 * FR-SUM-07 adds that summaries come from "predefined templates provided by the
 * client" — if a template ever introduces a fifth section, this is the line that
 * changes, and it should be a deliberate change rather than free text drifting in.
 */
export const SUMMARY_SECTION_KINDS = [
  "activities",
  "critical_alarms",
  "pending_actions",
  "safety_observations",
] as const;

export const summarySectionKindSchema = z.enum(SUMMARY_SECTION_KINDS);
export type SummarySectionKind = z.infer<typeof summarySectionKindSchema>;

export const SUMMARY_SECTION_LABEL: Record<SummarySectionKind, string> = {
  activities: "Activities",
  critical_alarms: "Critical alarms",
  pending_actions: "Pending actions",
  safety_observations: "Safety observations",
};

/**
 * Replaces the prototype's per-item hex (`'#C0392B'`, app-source.txt 1414–1417).
 * Colour is a theme decision made at render time — a hex on the wire cannot
 * respond to dark mode and would be the one place `globals.css` leaks.
 */
export const SEVERITY_VALUES = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const severitySchema = z.enum(SEVERITY_VALUES);
export type Severity = z.infer<typeof severitySchema>;

export const summaryItemWireSchema = z.object({
  text: z.string(),
  severity: severitySchema,
  /** FR-SUM-06's source reference. Structured so Phase 1 can link it. */
  record_id: z.string(),
});

export const summarySectionWireSchema = z.object({
  kind: summarySectionKindSchema,
  items: z.array(summaryItemWireSchema),
});

export const summaryCommentWireSchema = z.object({
  id: z.string(),
  author: actorWireSchema,
  body: z.string(),
  created_at: z.string(),
});

/**
 * FR-PA-02's outcome: the Supervisor confirmed this AI-suggested action belongs
 * in the report, and said why. Note the absence of an assignee — §6.2(a) is
 * explicit that confirmation produces a comment in the summary, not a task.
 */
export const aiConfirmationWireSchema = z.object({
  id: z.string(),
  /**
   * Which suggestion this records. Without it the confirmation cannot be tied
   * back to its source, and a repeated confirm — a double-click, or two tabs —
   * appends a second identical entry. NFR-12 forbids duplicate records, and this
   * is the field that makes the write idempotent.
   */
  suggestion_id: z.string(),
  title: z.string(),
  confirmed_by: actorWireSchema,
  confirmed_at: z.string(),
  comment: z.string(),
});

/** FR-SUM-02: "both on demand and automatically at end of every shift". */
export const summaryGenerationSchema = z.enum(["on_demand", "end_of_shift"]);

export const summaryWireSchema = z.object({
  id: z.string(),
  /** Ties back to `GET /shifts/current` — `YYYYMMDD-<D|N>`. */
  shift_id: z.string(),
  name: z.string(),
  window_label: z.string(),
  shift_date: z.string(),
  generated_at: z.string(),
  generated_by: actorWireSchema,
  /** Display-only label. Authorization is never decided from a role name. */
  generated_by_role: z.string(),
  generation: summaryGenerationSchema,
  sections: z.array(summarySectionWireSchema),
  comments: z.array(summaryCommentWireSchema),
  ai_confirmations: z.array(aiConfirmationWireSchema),
});

export const summarySchema = z.object({
  id: z.string(),
  shiftId: z.string(),
  name: z.string(),
  windowLabel: z.string(),
  shiftDate: z.string(),
  generatedAt: z.string(),
  generatedBy: actorSchema,
  generatedByRole: z.string(),
  generation: summaryGenerationSchema,
  sections: z.array(
    z.object({
      kind: summarySectionKindSchema,
      items: z.array(
        z.object({
          text: z.string(),
          severity: severitySchema,
          recordId: z.string(),
        })
      ),
    })
  ),
  comments: z.array(
    z.object({
      id: z.string(),
      author: actorSchema,
      body: z.string(),
      createdAt: z.string(),
    })
  ),
  aiConfirmations: z.array(
    z.object({
      id: z.string(),
      suggestionId: z.string(),
      title: z.string(),
      confirmedBy: actorSchema,
      confirmedAt: z.string(),
      comment: z.string(),
    })
  ),
});

export type SummaryWire = z.infer<typeof summaryWireSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type SummarySection = Summary["sections"][number];
export type SummaryComment = Summary["comments"][number];

export type SummaryItemWire = z.infer<typeof summaryItemWireSchema>;
export type SummarySectionWire = z.infer<typeof summarySectionWireSchema>;
export type SummaryCommentWire = z.infer<typeof summaryCommentWireSchema>;
export type AiConfirmationWire = z.infer<typeof aiConfirmationWireSchema>;

export const toSummary = (wire: SummaryWire): Summary => ({
  id: wire.id,
  shiftId: wire.shift_id,
  name: wire.name,
  windowLabel: wire.window_label,
  shiftDate: wire.shift_date,
  generatedAt: wire.generated_at,
  generatedBy: toActor(wire.generated_by),
  generatedByRole: wire.generated_by_role,
  generation: wire.generation,
  sections: wire.sections.map((section) => ({
    kind: section.kind,
    items: section.items.map((item) => ({
      text: item.text,
      severity: item.severity,
      recordId: item.record_id,
    })),
  })),
  comments: wire.comments.map((comment) => ({
    id: comment.id,
    author: toActor(comment.author),
    body: comment.body,
    createdAt: comment.created_at,
  })),
  aiConfirmations: wire.ai_confirmations.map((confirmation) => ({
    id: confirmation.id,
    suggestionId: confirmation.suggestion_id,
    title: confirmation.title,
    confirmedBy: toActor(confirmation.confirmed_by),
    confirmedAt: confirmation.confirmed_at,
    comment: confirmation.comment,
  })),
});

/**
 * The list row. A summary body is four sections of prose; sending fourteen of
 * them to render a table would be wasteful, so the list omits them and the
 * detail endpoint carries them.
 */
export const summaryListItemWireSchema = summaryWireSchema.omit({
  sections: true,
  comments: true,
  ai_confirmations: true,
});

/**
 * The same row in app spelling. It is a **distinct type from `Summary`**, not a
 * convenience alias, and that is load-bearing: a list row genuinely has no
 * `sections`, so a component handed one cannot be allowed to read them. Typing
 * the list as `Summary` compiled happily and produced `undefined.map` at
 * runtime — the compiler catches it only if the two shapes stay separate.
 */
export const summaryListItemSchema = summarySchema.omit({
  sections: true,
  comments: true,
  aiConfirmations: true,
});

export type SummaryListItemWire = z.infer<typeof summaryListItemWireSchema>;
export type SummaryListItem = z.infer<typeof summaryListItemSchema>;

export const toSummaryListItem = (
  wire: SummaryListItemWire
): SummaryListItem => ({
  id: wire.id,
  shiftId: wire.shift_id,
  name: wire.name,
  windowLabel: wire.window_label,
  shiftDate: wire.shift_date,
  generatedAt: wire.generated_at,
  generatedBy: toActor(wire.generated_by),
  generatedByRole: wire.generated_by_role,
  generation: wire.generation,
});

export const summaryListResponseSchema = envelopeSchema(
  paginatedSchema(summaryListItemWireSchema)
);
export const summaryDetailResponseSchema = envelopeSchema(summaryWireSchema);

/* -------------------------------------------------------------------------- */
/* Requests the client sends                                                   */
/* -------------------------------------------------------------------------- */

/**
 * FR-SUM-02 — on-demand generation. FR-SUM-04 is the reason there is no approval
 * field anywhere in this file: "Allow any authorised user to create a summary
 * **without a mandatory approval gate**."
 */
export const summaryGenerateSchema = z.object({
  shift_id: z.string().trim().min(1, "Choose a shift"),
});

/** FR-SUM-08 — whether this is permitted at all is Admin/Super-User controlled. */
export const summaryCommentCreateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Enter a comment")
    .max(2000, "Comment must be 2000 characters or fewer"),
});

/** FR-SUM-09 — "Export shift summaries to PDF, Excel and Word". */
export const SUMMARY_EXPORT_FORMATS = ["pdf", "excel", "word"] as const;
export const summaryExportFormatSchema = z.enum(SUMMARY_EXPORT_FORMATS);
export type SummaryExportFormat = z.infer<typeof summaryExportFormatSchema>;

/**
 * **FR-HOME-04** — "Allow browsing of previous shifts, dates, and other areas."
 *
 * `from` / `to` are `YYYY-MM-DD` (what `<input type="date">` submits) or empty
 * for "unbounded", and both bounds are inclusive. They are **PROVISIONAL** in
 * the same sense as every field name in this file: the requirement is quoted,
 * the param spelling is inferred.
 *
 * There is no `area` filter, and the reason is this schema rather than a policy:
 * a summary carries a **shift**, not a location, because a shift summary covers
 * the whole plant by construction. FR-HOME-04's "other areas" is answerable on
 * `/actions`, which has the field — it is not a question this resource can be
 * asked.
 *
 * (An earlier note here cited §9.2 as having "removed area-based filtering".
 * That was a misreading: §9.2 scopes its statement to *AI answers* —
 * "Data-level area filtering on AI answers is therefore not required" — and
 * §6.2 keeps area first-class as Administrator-configured data scope.)
 */
export const summaryFiltersSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  search: z.string(),
  from: z.string(),
  to: z.string(),
});
