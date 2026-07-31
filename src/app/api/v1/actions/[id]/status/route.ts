import { actionStatusUpdateSchema } from "@/features/actions/schemas";
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
 * `PATCH /api/v1/actions/:id/status` — move an action through FR-PA-04's
 * lifecycle (Open → In Progress → On Hold → Completed → Cancelled → Verified).
 *
 * **FR-PA-05 is enforced here, not in the UI.** "Make action assignment,
 * tracking, update and closure available **only when the Administrator enables
 * the workflow**." So with `supervisor_action_workflow` off — which is the
 * seeded default, and the BRD's default — this endpoint answers 403 even for a
 * Supervisor holding `action:write`. That is the point of FR-ADM-03: the gate
 * lives at the API, and hiding the button is never the access control.
 *
 * The 403 carries a message naming the workflow, so the UI can explain *why*
 * rather than showing a generic denial.
 */
const WORKFLOW_DISABLED_MESSAGE =
  "Action tracking is unavailable: an Administrator has not enabled the Supervisor Action Workflow (FR-PA-05).";

export const PATCH = mockRouteWithParams<{ id: string }>(
  { permission: "action:write" },
  async ({ request, session, params }) => {
    if (!isWorkflowEnabled("supervisor_action_workflow")) {
      return forbidden(WORKFLOW_DISABLED_MESSAGE);
    }

    const action = findById(mockStore().actions, params.id);
    if (!action) return notFound(`Action ${params.id}`);

    const body = await readJson(request, actionStatusUpdateSchema);
    if (!body.ok) return body.response;

    const updated = patchById(mockStore().actions, params.id, {
      status: body.data.status,
    });
    if (!updated) return notFound(`Action ${params.id}`);

    recordAudit(
      session,
      "UPDATE_ACTION_STATUS",
      `${updated.id} → ${updated.status}`
    );

    return okJson(updated);
  }
);
