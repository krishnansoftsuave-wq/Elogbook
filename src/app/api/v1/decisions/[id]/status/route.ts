import { decisionStatusUpdateSchema } from "@/features/decisions/schemas";
import {
  forbidden,
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import {
  findById,
  isWorkflowEnabled,
  mockStore,
  patchById,
  recordAudit,
} from "@/mocks/store";

/**
 * `PATCH /api/v1/decisions/:id/status` — move a decision toward closure.
 *
 * Gated on `management_decision_workflow`. §6.3(b) is where "track to
 * completion" appears; §6.3(a) is record-only — "no workflow is triggered". So
 * with the toggle off a decision can be recorded and read but not progressed,
 * which is the BRD's default rather than a limitation of the mock.
 */
const WORKFLOW_DISABLED_MESSAGE =
  "Decision tracking is unavailable: an Administrator has not enabled the Management Decision Workflow. Decisions are recorded for future reference only (BRD §6.3(a)).";

export const PATCH = mockRouteWithParams<{ id: string }>(
  { permission: "analytics:read" },
  async ({ request, session, params }) => {
    if (!isWorkflowEnabled("management_decision_workflow")) {
      return forbidden(WORKFLOW_DISABLED_MESSAGE);
    }

    const decision = findById(mockStore().decisions, params.id);
    if (!decision) return notFound(`Decision ${params.id}`);

    const body = await readJson(request, decisionStatusUpdateSchema);
    if (!body.ok) return body.response;

    const now = new Date().toISOString().replace(/Z$/, "+00:00");
    const actor = {
      username: session.username,
      display_name: session.display_name,
    };

    decision.timeline.push({
      kind: body.data.status === "completed" ? "closed" : "status_changed",
      at: now,
      text: `Status moved to ${body.data.status.replace(/_/g, " ")}`,
      actor,
    });

    const updated = patchById(mockStore().decisions, params.id, {
      status: body.data.status,
      closure: body.data.closure ?? decision.closure,
      timeline: decision.timeline,
    });
    if (!updated) return notFound(`Decision ${params.id}`);

    recordAudit(
      session,
      "RECORD_DECISION",
      `${updated.id} → ${updated.status}`
    );

    return okJson(updated);
  }
);
