import { actionAssignSchema } from "@/features/actions/schemas";
import { findMockAccount } from "@/mocks/auth/directory";
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
 * `PUT /api/v1/actions/:id/owner` — assign or clear an action's owner.
 *
 * The single most requirement-sensitive endpoint in Phase 0a. **§6.2(a)** is the
 * *default* behaviour and it is explicit: reviewing a suggested action produces
 * a comment in the summary and "**no task is assigned to operators and there is
 * no escalation step**". **FR-PA-05** makes assignment available "only when the
 * Administrator enables the workflow".
 *
 * So this 403s unless `supervisor_action_workflow` is on, and it requires
 * `action:assign` — a permission only the Supervisor role carries. Two
 * independent gates, because the workflow toggle and the permission answer
 * different questions: *is this capability turned on at all* versus *may this
 * person use it*.
 *
 * Existing seeded owners are not evidence against this. FR-PA-03 lists owner
 * among the fields an action records; what is gated is setting one.
 */
const WORKFLOW_DISABLED_MESSAGE =
  "Assignment is unavailable: an Administrator has not enabled the Supervisor Action Workflow. Confirmed actions are recorded in the summary instead (BRD §6.2(a), FR-PA-05).";

export const PUT = mockRouteWithParams<{ id: string }>(
  { permission: "action:assign" },
  async ({ request, session, params }) => {
    if (!isWorkflowEnabled("supervisor_action_workflow")) {
      return forbidden(WORKFLOW_DISABLED_MESSAGE);
    }

    const action = findById(mockStore().actions, params.id);
    if (!action) return notFound(`Action ${params.id}`);

    const body = await readJson(request, actionAssignSchema);
    if (!body.ok) return body.response;

    const { owner_username: ownerUsername } = body.data;

    if (ownerUsername === null) {
      const cleared = patchById(mockStore().actions, params.id, {
        owner: null,
      });
      if (!cleared) return notFound(`Action ${params.id}`);
      // `ASSIGN_ACTION`: FR-PA-03's ownership, which is not the FR-PA-04
      // lifecycle `UPDATE_ACTION_STATUS` names.
      recordAudit(session, "ASSIGN_ACTION", `${cleared.id} unassigned`);
      return okJson(cleared);
    }

    const account = findMockAccount(ownerUsername);
    if (!account) return notFound(`User ${ownerUsername}`);

    const updated = patchById(mockStore().actions, params.id, {
      owner: {
        username: account.username,
        display_name: account.displayName,
      },
    });
    if (!updated) return notFound(`Action ${params.id}`);

    recordAudit(
      session,
      "ASSIGN_ACTION",
      `${updated.id} assigned to ${account.username}`
    );

    return okJson(updated);
  }
);
