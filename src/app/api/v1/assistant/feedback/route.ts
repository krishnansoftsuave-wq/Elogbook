import { assistantFeedbackCreateSchema } from "@/features/assistant/schemas";
import { mockRoute, okJson, readJson } from "@/mocks/handler";
import { mockStore, nextId, recordAudit } from "@/mocks/store";

/**
 * `POST /api/v1/assistant/feedback` — **FR-FB-01**, verbatim: "Capture user
 * feedback on AI answers and citations (**thumbs up/down with an optional
 * comment**)".
 *
 * **PROVISIONAL.** No feedback endpoint existed in the Phase 0a contract; the
 * requirement is quoted, the path and field names are inferred. Correcting them
 * is an edit to this file, `features/assistant/schemas.ts` and the mutation.
 *
 * Gated on `assistant:query` rather than a permission of its own: rating an
 * answer is part of using the assistant, and every role that can ask can rate.
 * A separate `feedback:write` would be inventing an entry in the permission
 * table the backend never sent.
 *
 * **Capture only.** §7.13 frames the loop as "human-gated — nothing changes
 * autonomously", and FR-FB-02..05 (classification into a ranked backlog, the
 * approval step, the RAGAS quality gate, the golden dataset) are Admin-side and
 * **[BACKEND]**. This endpoint stores what somebody thought; it draws no
 * conclusion from it.
 *
 * **Not idempotent, deliberately.** Changing your mind is a real event, and
 * NFR-12 is about not creating duplicate *records* from one intent, not about
 * collapsing two intents. The client sends one rating per press; the UI is what
 * stops a double-click, and a real backend would keep the history rather than
 * overwrite it — FR-FB-04 feeds "confirmed corrections" into the golden dataset,
 * which needs the sequence, not just the latest value.
 */
export const POST = mockRoute(
  { permission: "assistant:query" },
  async ({ request, session }) => {
    const body = await readJson(request, assistantFeedbackCreateSchema);
    if (!body.ok) return body.response;

    const feedback = {
      id: nextId("FB"),
      answer_id: body.data.answer_id,
      rating: body.data.rating,
      comment: body.data.comment ?? "",
      // Null means "about the answer as a whole"; a record id means "this
      // source was wrong", which is a different finding and FR-FB-02 classifies
      // them differently.
      citation_record_id: body.data.citation_record_id ?? null,
      submitted_by: session.username,
      submitted_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    };

    mockStore().assistantFeedback.push(feedback);

    // FR-OBS-01 / §9.3 — its own action, not `ASSISTANT_QUERY`. An audit row
    // that calls a thumbs-down a query records something that did not happen.
    recordAudit(
      session,
      "ASSISTANT_FEEDBACK",
      `${feedback.answer_id} · ${feedback.rating}`
    );

    return okJson(feedback, 201);
  }
);
