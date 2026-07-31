import { suggestionConfirmSchema } from "@/features/actions/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import {
  findById,
  latestSummaryFirst,
  mockStore,
  nextId,
  patchById,
  recordAudit,
} from "@/mocks/store";

/**
 * `POST /api/v1/suggestions/:id/confirm` — FR-PA-02, the Supervisor's decision.
 *
 * "Have a Supervisor review AI-suggested actions and confirm whether each is
 * included in the summary; **no assignment to operators**."
 *
 * That last clause is why this handler writes an `ai_confirmation` onto the
 * current summary and **does not create an action**. §6.2(a) says the same
 * thing twice over: confirming "only whether each is included as a comment in
 * the summary report", and the full tracking workflow is a separate,
 * Admin-enabled thing. A handler that quietly minted a pending action here would
 * implement §6.2(b) as the default and nobody would see it happen.
 *
 * Requires `action:confirm`, which only the Supervisor role holds.
 */
export const POST = mockRouteWithParams<{ id: string }>(
  { permission: "action:confirm" },
  async ({ request, session, params }) => {
    const suggestion = findById(mockStore().suggestions, params.id);
    if (!suggestion) return notFound(`Suggestion ${params.id}`);

    const body = await readJson(request, suggestionConfirmSchema);
    if (!body.ok) return body.response;

    const updated = patchById(mockStore().suggestions, params.id, {
      confirmed: body.data.confirmed,
    });
    if (!updated) return notFound(`Suggestion ${params.id}`);

    // Confirmed suggestions surface in the shift summary — FR-PA-02's "included
    // in the summary", and FR-SUM-01's Pending Actions section.
    //
    // Idempotent by `suggestion_id` (NFR-12, "no duplicate records"): a
    // double-click or a second tab must not append the same confirmation twice,
    // and un-confirming must remove it rather than leave a stale entry behind.
    // The latest shift's summary, by the **same comparator `GET /summaries`
    // uses**. Taking `summaries[0]` was equivalent until the list started
    // sorting, and then silently stopped being so — a confirmation could attach
    // to a record no screen was showing. `latestSummaryFirst` exists so the two
    // cannot drift again.
    const current = [...mockStore().summaries].sort(latestSummaryFirst)[0];

    if (current) {
      const existing = current.ai_confirmations.findIndex(
        (entry) => entry.suggestion_id === suggestion.id
      );

      if (body.data.confirmed) {
        const record = {
          id: current.ai_confirmations[existing]?.id ?? nextId("AIC"),
          suggestion_id: suggestion.id,
          title: suggestion.title,
          confirmed_by: {
            username: session.username,
            display_name: session.display_name,
          },
          confirmed_at: new Date().toISOString().replace(/Z$/, "+00:00"),
          comment: body.data.comment ?? "",
        };

        if (existing === -1) current.ai_confirmations.push(record);
        else current.ai_confirmations[existing] = record;
      } else if (existing !== -1) {
        current.ai_confirmations.splice(existing, 1);
      }
    }

    /*
      The reason travels with a rejection too. **FR-FB-01** attaches "an optional
      comment" to "confirm/reject on AI-suggested pending actions", and a
      rejection's reason is the more useful half — FR-FB-02 classifies feedback
      into "retrieval miss, wrong citation, unclear answer", none of which a bare
      `confirmed: false` distinguishes.
      Recorded on the audit target because a rejected suggestion writes nothing
      to the summary, so there is nowhere else for it to live until the feedback
      store the §7.13 loop needs actually exists.
    */
    const rejectionNote =
      !body.data.confirmed && body.data.comment
        ? ` — ${body.data.comment}`
        : "";

    recordAudit(
      session,
      body.data.confirmed ? "ACCEPT_AI_ACTION" : "REJECT_AI_ACTION",
      `${suggestion.id}${rejectionNote}`
    );

    return okJson(updated);
  }
);
