import { summaryCommentCreateSchema } from "@/features/summaries/schemas";
import { hasPermission } from "@/lib/auth/permissions";
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
  nextId,
  recordAudit,
} from "@/mocks/store";

/**
 * `POST /api/v1/summaries/:id/comments` — **FR-SUM-08**.
 *
 * "Control comment access on a shift summary for Operator and Supervisor through
 * the **Admin / Super User**." §6.1 states the Operator half concretely: comment
 * or edit "**only if** the Administrator / Super User has granted comment
 * access; otherwise the summary is view-only".
 *
 * **The gate is permission-shaped, not role-shaped, and that is load-bearing.**
 * An earlier version asked "is every one of this session's roles `operator`?"
 * and it failed *open*: `maryam.alzadjali` holds OPERATORS **and**
 * SUPERINTENDENTS (`mocks/auth/directory.ts`), so the `every()` was false, the
 * toggle check was skipped entirely, and she could comment as an Operator while
 * the Administrator had commenting switched off. Management could comment
 * unconditionally for the same reason.
 *
 * BRD §4 is explicit that *"The role list is not final"* and that Admin-defined
 * custom roles must be supportable, so any gate keyed on a closed set of role
 * names widens that hole with every role added. Asking the permission instead
 * fails **closed** for a role this build has never heard of.
 *
 * Two questions, still answered separately: `summary:comment` says *may this
 * session comment at all* (only Supervisor holds it, per §6's table, and
 * Administrator reaches it through the wildcard), and the toggle says *has the
 * Administrator granted it to everyone else*.
 */
const COMMENTS_DISABLED_MESSAGE =
  "Commenting is turned off by your administrator — you can view comments but cannot add them (FR-SUM-08).";

export const POST = mockRouteWithParams<{ id: string }>(
  { permission: "summary:read" },
  async ({ request, session, params }) => {
    const mayComment =
      hasPermission(session.permissions, "summary:comment") ||
      isWorkflowEnabled("operator_comment_permission");

    if (!mayComment) return forbidden(COMMENTS_DISABLED_MESSAGE);

    const summary = findById(mockStore().summaries, params.id);
    if (!summary) return notFound(`Summary ${params.id}`);

    const body = await readJson(request, summaryCommentCreateSchema);
    if (!body.ok) return body.response;

    const comment = {
      id: nextId("SCM"),
      author: {
        username: session.username,
        display_name: session.display_name,
      },
      body: body.data.body,
      created_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    };

    summary.comments.push(comment);
    // FR-SUM-08's comment, not FR-SUM-02's generation.
    recordAudit(session, "COMMENT_SUMMARY", summary.id);

    return okJson(comment, 201);
  }
);
