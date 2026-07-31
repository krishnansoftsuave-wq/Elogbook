import { assistantQuerySchema } from "@/features/assistant/schemas";
import {
  LOW_CONFIDENCE_THRESHOLD,
  answerFor,
  detectLanguage,
} from "@/mocks/data/assistant";
import { mockRoute, okJson, readJson } from "@/mocks/handler";
import { currentShift } from "@/mocks/shifts/current";
import { mockStore, nextId, recordAudit } from "@/mocks/store";

/**
 * `POST /api/v1/assistant/query` — §7.4.
 *
 * **The answer itself is [BACKEND].** It comes from an on-premises LLM doing RAG
 * over the curated Iceberg layer (FR-DATA-01/02). What is mocked is the response
 * *contract*, so the Phase 1 screen can be built and proven against the shape
 * the real service will send. The prototype's client-side `localParse` is
 * deliberately not ported — a fake parser in the browser would teach the
 * frontend a shape the backend never produces.
 *
 * Three requirements are visible in the response and none of them are optional:
 *
 * - **FR-AI-03** — citations carry shift date, timestamp and record ID, with a
 *   `target_type`/`target_id` the UI can turn into click-through. The prototype
 *   renders sources as flat unlinked strings; this closes that gap.
 * - **FR-AI-05** — `low_confidence` is computed here, not left to each client to
 *   threshold, so "state clearly when confidence is low" cannot be quietly
 *   dropped by one screen.
 * - **FR-AI-01** — the answer comes back in the language asked.
 *
 * **FR-AI-04 is visible by its absence**: `session.area_scope` is never read.
 * "Do not restrict answers by area; all operational users may query all units",
 * and §9.2 records that the client removed area filtering. The filters in the
 * request body are the user's own (FR-AI-06) — narrowing what *they* asked for
 * is not the same as restricting what they may see.
 *
 * **FR-OBS-01 / FR-ADM-05** — every question is audited.
 */
export const QUERY_AUDIT_TARGET_LIMIT = 120;

export const POST = mockRoute(
  { permission: "assistant:query" },
  async ({ request, session }) => {
    const body = await readJson(request, assistantQuerySchema);
    if (!body.ok) return body.response;

    const { question } = body.data;
    const language = detectLanguage(question);
    const { answer, confidence, citations } = answerFor(question, language);
    // The configured boundary, so a citation's shift id agrees with the one the
    // dashboard is showing (FR-AI-05 pairs the answer with a shift date).
    const shift = currentShift(new Date(), mockStore().shiftConfig);
    const now = new Date().toISOString().replace(/Z$/, "+00:00");

    const result = {
      id: nextId("ASK"),
      question,
      answer,
      language,
      confidence,
      low_confidence: confidence < LOW_CONFIDENCE_THRESHOLD,
      citations: citations.map((citation) => ({
        ...citation,
        // The mock has no real record timestamps to cite, so the citation is
        // stamped against the live shift. A real backend returns the entry's own
        // instant — this is the one field here that is a stand-in rather than a
        // contract statement.
        occurred_at: now,
        shift_id: citation.shift_id || shift.shift_id,
      })),
      created_at: now,
    };

    recordAudit(
      session,
      "ASSISTANT_QUERY",
      question.slice(0, QUERY_AUDIT_TARGET_LIMIT)
    );

    return okJson(result);
  }
);
