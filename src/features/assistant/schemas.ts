import { z } from "zod";

import { envelopeSchema } from "@/lib/zod";

/**
 * The AI assistant — BRD §7.4.
 *
 * The prototype answers with `localParse()` / `sendChat`, a client-side keyword
 * match over its own mock arrays (`app-source.txt` 1345–1359). That is
 * **[BACKEND]** and is deliberately not ported: the real answer comes from an
 * on-premises LLM over the Spark/Iceberg golden layer (FR-DATA-01), and a fake
 * parser in the browser would teach the frontend a shape the backend never sends.
 *
 * What this file models is the *response contract*, and three requirements shape
 * it beyond anything the prototype does:
 *
 * - **FR-AI-03** — every answer shows shift date, timestamp (GST) and record ID,
 *   "with click-through to the original entry". The prototype renders sources as
 *   flat strings with nothing to click; `citation` is structured so Phase 1 can
 *   link them. This is a gap the prototype does **not** close.
 * - **FR-AI-05** — "State clearly when confidence is low rather than risk an
 *   incorrect answer." Hence an explicit `low_confidence` flag decided
 *   server-side, so every client agrees where the line sits.
 * - **FR-AI-01** — English and Arabic are both first-class and the answer comes
 *   back in the language asked.
 *
 * **NFR-06 (OWASP LLM Top 10)**: `answer` is model output and therefore
 * untrusted. It is plain text and must never reach `dangerouslySetInnerHTML`.
 *
 * PROVISIONAL field names. The envelope is not provisional.
 */

export const ASSISTANT_LANGUAGES = ["en", "ar"] as const;
export const assistantLanguageSchema = z.enum(ASSISTANT_LANGUAGES);
export type AssistantLanguage = z.infer<typeof assistantLanguageSchema>;

export const CITATION_TARGET_TYPES = [
  "log_entry",
  "action",
  "summary",
] as const;

export const citationTargetTypeSchema = z.enum(CITATION_TARGET_TYPES);
export type CitationTargetType = z.infer<typeof citationTargetTypeSchema>;

/** FR-AI-03's source proof, as data rather than as a rendered string. */
export const citationWireSchema = z.object({
  record_id: z.string(),
  label: z.string(),
  /** Which shift the cited record belongs to — `YYYYMMDD-<D|N>`. */
  shift_id: z.string(),
  /** ISO-8601 with offset. Rendered in GST by the UI, per FR-AI-03. */
  occurred_at: z.string(),
  target_type: citationTargetTypeSchema,
  target_id: z.string(),
  /**
   * Deep link into the **source** system, for a `log_entry` this platform cites
   * but does not host.
   *
   * FR-AI-03 requires "click-through to the original entry" and §11's acceptance
   * criteria repeat it. An `action` or a `summary` resolves to a route here; a
   * log entry lives in the existing E-Logbook, and without this field there is
   * nothing a citation could ever link to — which would leave the requirement
   * permanently half-met for the citation type it most obviously means.
   *
   * §3.2's "no development or modification" of that system forbids **writing** to
   * it. Linking is a read, and reads are the entire premise (FR-DATA-01).
   *
   * **Optional, and PROVISIONAL**: the backend may not be able to construct one,
   * and until it does the UI renders the citation as text rather than a dead
   * link. Adding the field now costs nothing and keeps the option open before the
   * contract freezes.
   */
  source_url: z.string().url().optional(),
});

export const assistantAnswerWireSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  language: assistantLanguageSchema,
  /** 0–100. */
  confidence: z.number().min(0).max(100),
  /** FR-AI-05 — decided by the backend, not by a threshold in each client. */
  low_confidence: z.boolean(),
  citations: z.array(citationWireSchema),
  created_at: z.string(),
});

export const citationSchema = z.object({
  recordId: z.string(),
  label: z.string(),
  shiftId: z.string(),
  occurredAt: z.string(),
  targetType: citationTargetTypeSchema,
  targetId: z.string(),
  sourceUrl: z.string().optional(),
});

export const assistantAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  language: assistantLanguageSchema,
  confidence: z.number(),
  lowConfidence: z.boolean(),
  citations: z.array(citationSchema),
  createdAt: z.string(),
});

export type CitationWire = z.infer<typeof citationWireSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type AssistantAnswerWire = z.infer<typeof assistantAnswerWireSchema>;
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;

export const toAssistantAnswer = (
  wire: AssistantAnswerWire
): AssistantAnswer => ({
  id: wire.id,
  question: wire.question,
  answer: wire.answer,
  language: wire.language,
  confidence: wire.confidence,
  lowConfidence: wire.low_confidence,
  citations: wire.citations.map((citation) => ({
    recordId: citation.record_id,
    label: citation.label,
    shiftId: citation.shift_id,
    occurredAt: citation.occurred_at,
    targetType: citation.target_type,
    targetId: citation.target_id,
    ...(citation.source_url ? { sourceUrl: citation.source_url } : {}),
  })),
  createdAt: wire.created_at,
});

export const assistantAnswerResponseSchema = envelopeSchema(
  assistantAnswerWireSchema
);

/**
 * **FR-AI-06** — "Support filtering by equipment, date range, author, and area."
 *
 * Note what is *not* here: an area restriction applied on the user's behalf.
 * **FR-AI-04** is explicit — "**Do not restrict answers by area**; all
 * operational users may query all units" — and §9.2 records that the client
 * removed area-based filtering. These are the user's own filters, narrowing what
 * they asked for. `areaScope` from the session must never be injected here.
 */
export const assistantQuerySchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Enter a question")
    .max(1000, "Question must be 1000 characters or fewer"),
  equipment: z.string().trim().optional(),
  area: z.string().trim().optional(),
  author: z.string().trim().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

/*
 * Request types live in `types.ts` with the rest of the derived types
 * (`AssistantQueryValues`, `AssistantFeedbackValues`). Declaring them here too
 * gave the same shape two names, and `noUnusedLocals` does not flag an unused
 * *export*, so nothing caught it.
 */

/* -------------------------------------------------------------------------- */
/* Feedback — FR-FB-01                                                         */
/* -------------------------------------------------------------------------- */

/**
 * **FR-FB-01**, verbatim: "Capture user feedback on AI answers **and
 * citations** (**thumbs up/down with an optional comment**), and confirm/reject
 * on AI-suggested pending actions."
 *
 * Two halves of that sentence shape this schema:
 *
 * - `rating` is a two-value enum, not a 1–5 score. The requirement says thumbs,
 *   and a scale would invite a "3" that means nothing to FR-FB-02's
 *   classification step.
 * - `citation_record_id` exists because feedback is on answers **and
 *   citations**. Omitted, the feedback is about the answer as a whole; present,
 *   it says *this source was wrong* — which is precisely FR-FB-02's "wrong
 *   citation" category, and is unrecoverable if the two are collapsed into one.
 *
 * §7.13's framing bounds what this is for: "nothing changes autonomously". This
 * captures; **FR-FB-02..05** — classification, the human-gated approval loop,
 * the RAGAS quality gate and the golden dataset — are Admin-side and [BACKEND],
 * and are not built.
 *
 * **PROVISIONAL field names**, on the same terms as the rest of this file. The
 * requirement is quoted; the spelling is inferred, because no feedback endpoint
 * existed in the Phase 0a contract at all.
 */
export const FEEDBACK_RATINGS = ["up", "down"] as const;
export const feedbackRatingSchema = z.enum(FEEDBACK_RATINGS);
export type FeedbackRating = z.infer<typeof feedbackRatingSchema>;

export const assistantFeedbackCreateSchema = z.object({
  answer_id: z.string().trim().min(1, "Missing answer"),
  rating: feedbackRatingSchema,
  /** FR-FB-01's "optional comment". */
  comment: z
    .string()
    .trim()
    .max(2000, "Comment must be 2000 characters or fewer")
    .optional(),
  /** Set when the feedback is about one citation rather than the answer. */
  citation_record_id: z.string().trim().optional(),
});

export const assistantFeedbackWireSchema = z.object({
  id: z.string(),
  answer_id: z.string(),
  rating: feedbackRatingSchema,
  comment: z.string(),
  citation_record_id: z.string().nullable(),
  submitted_by: z.string(),
  submitted_at: z.string(),
});

export const assistantFeedbackResponseSchema = envelopeSchema(
  assistantFeedbackWireSchema
);

export type AssistantFeedbackWire = z.infer<typeof assistantFeedbackWireSchema>;
