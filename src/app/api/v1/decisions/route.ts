import { decisionCreateSchema } from "@/features/decisions/schemas";
import { findMockAccount } from "@/mocks/auth/directory";
import {
  forbidden,
  matchesSearch,
  mockRoute,
  notFound,
  okJson,
  paginate,
  readJson,
} from "@/mocks/handler";
import {
  isWorkflowEnabled,
  mockStore,
  nextId,
  recordAudit,
} from "@/mocks/store";

/**
 * Management risk decisions — BRD §6.3. **No FR-ID exists for this entity**; see
 * `features/decisions/schemas.ts`. Cite §6.3 and FR-DASH-03, never `FR-DEC-*`.
 *
 * Gated on `analytics:read`, the permission that distinguishes Management from
 * the operational roles in `ROLE_PERMISSIONS`. That is an inference, not a
 * quoted requirement — §6.3 places the decision workflow with Management and
 * FR-DASH-03 has the Super User control access to it, but neither names a
 * permission string. Flagged rather than presented as settled.
 */
export const GET = mockRoute(
  { permission: "analytics:read" },
  ({ request }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const rows = mockStore()
      .decisions.filter((decision) => {
        if (status && status !== "all" && decision.status !== status) {
          return false;
        }
        return matchesSearch(
          searchParams.get("search"),
          decision.id,
          decision.title,
          decision.risk,
          decision.equipment
        );
      })
      .map(({ timeline, comments, notified, ...listItem }) => {
        // The list does not carry the history — see decisionListItemWireSchema.
        void timeline;
        void comments;
        void notified;
        return listItem;
      });

    return okJson(paginate(rows, searchParams));
  }
);

/**
 * `POST /api/v1/decisions` — record a risk decision.
 *
 * **Recording is always allowed.** §6.3(a) is the *default* and it is still a
 * write: "Where a risk is identified, **record the risk and the decision for
 * future reference — no workflow is triggered**." A handler that 403'd here
 * whenever the workflow was off would delete the default behaviour rather than
 * implement it.
 *
 * What the toggle gates is the §6.3(b) half — "route to the concerned person,
 * and track to completion". So `owner_username` is refused unless
 * `management_decision_workflow` is on, and `notified` stays empty until it is.
 */
const WORKFLOW_DISABLED_MESSAGE =
  "This decision can be recorded, but it cannot be routed to an owner: an Administrator has not enabled the Management Decision Workflow. Decisions are stored for future reference only (BRD §6.3(a)).";

export const POST = mockRoute(
  { permission: "analytics:read" },
  async ({ request, session }) => {
    const body = await readJson(request, decisionCreateSchema);
    if (!body.ok) return body.response;

    const workflowOn = isWorkflowEnabled("management_decision_workflow");
    const { owner_username: ownerUsername } = body.data;

    if (ownerUsername && !workflowOn) {
      return forbidden(WORKFLOW_DISABLED_MESSAGE);
    }

    const ownerAccount = ownerUsername
      ? findMockAccount(ownerUsername)
      : undefined;
    if (ownerUsername && !ownerAccount) {
      return notFound(`User ${ownerUsername}`);
    }

    const owner = ownerAccount
      ? {
          username: ownerAccount.username,
          display_name: ownerAccount.displayName,
        }
      : null;

    const raisedBy = {
      username: session.username,
      display_name: session.display_name,
    };
    const now = new Date().toISOString().replace(/Z$/, "+00:00");

    const decision = {
      id: nextId("DEC"),
      title: body.data.title,
      risk: body.data.risk,
      area: body.data.area,
      equipment: body.data.equipment,
      priority: body.data.priority,
      detail: body.data.detail,
      owner,
      due_at: body.data.due_at,
      status: "in_progress" as const,
      raised_by: raisedBy,
      raised_at: now,
      // §6.3(a): "no workflow is triggered" — nobody is notified while the
      // toggle is off, which is exactly what an empty list records.
      notified: owner && workflowOn ? [owner] : [],
      timeline: [
        {
          kind: "recorded" as const,
          at: now,
          text: "Decision recorded",
          actor: raisedBy,
        },
      ],
      comments: [],
      closure: null,
    };

    mockStore().decisions.unshift(decision);
    recordAudit(session, "RECORD_DECISION", decision.id);

    return okJson(decision, 201);
  }
);
