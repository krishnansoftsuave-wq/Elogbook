import {
  WORKFLOW_PERMISSION,
  workflowUpdateSchema,
} from "@/features/admin/schemas";
import { hasPermission } from "@/lib/auth/permissions";
import {
  forbidden,
  mockRoute,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { mockStore, recordAudit } from "@/mocks/store";

/**
 * `GET|PATCH /api/v1/admin/workflows` — the four Administrator switches, §6.4:
 * "Enable or disable workflow for Supervisor & Management."
 *
 * These are the most consequential records in the mock. Every one of them
 * defaults **off**, and three other endpoints (`actions/:id/status`,
 * `actions/:id/owner`, `decisions/:id/status`) answer 403 while they are —
 * because FR-PA-05 and §6.3(a) say the default is review-and-record, not
 * assign-and-track.
 *
 * `GET` is deliberately open to any authenticated session, not wildcard-gated:
 * every screen that shows or hides an assignment control has to know whether the
 * capability is on, and an Operator's UI cannot ask an admin-only endpoint. It
 * leaks nothing — the switch positions are policy, not data.
 *
 * ## Writing is gated **per switch**, not per route
 *
 * `mockRoute`'s `permission` takes one value for the whole handler, and one
 * value is the wrong shape here. Two of the four switches are a **Super User**
 * capability the BRD names four times — §6.5's fourth bullet, the §4 role table,
 * **FR-ADM-06** and **FR-DASH-03** all say the Super User controls *"access to
 * comments and the decision workflow"* — while **FR-PA-05** reserves action
 * assignment to the *"Administrator"*. So the check moves inside, keyed off the
 * body: see `WORKFLOW_PERMISSION`.
 *
 * That ordering is deliberate. The body is read first, so an unknown key is a
 * 422 naming the field rather than a 403 that would tell a caller they lacked a
 * permission for a switch that does not exist.
 */
export const GET = mockRoute({}, () =>
  okJson({ items: mockStore().workflows })
);

export const PATCH = mockRoute({}, async ({ request, session }) => {
  const body = await readJson(request, workflowUpdateSchema);
  if (!body.ok) return body.response;

  const required = WORKFLOW_PERMISSION[body.data.key];
  if (!hasPermission(session.permissions, required)) {
    // 403, not 401: the token is valid and the session must survive.
    return forbidden(
      `Changing ${body.data.key} requires the ${required} permission.`
    );
  }

  const workflow = mockStore().workflows.find(
    (candidate) => candidate.key === body.data.key
  );
  if (!workflow) return notFound(`Workflow ${body.data.key}`);

  workflow.enabled = body.data.enabled;

  // FR-ADM-05 lists "settings changes" among what the audit trail must carry,
  // and this is the settings change with the widest blast radius.
  recordAudit(
    session,
    "UPDATE_WORKFLOW",
    `${workflow.key} → ${workflow.enabled ? "enabled" : "disabled"}`
  );

  return okJson(workflow);
});
