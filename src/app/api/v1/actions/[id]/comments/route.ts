import { actionCommentCreateSchema } from "@/features/actions/schemas";
import { hasPermission } from "@/lib/auth/permissions";
import {
  forbidden,
  mockRouteWithParams,
  notFound,
  okJson,
  paginate,
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
 * `GET|POST /api/v1/actions/:id/comments` — the discussion thread on an action.
 *
 * **FR-SUM-08 / §6.1** govern who may *write*: an Operator may "comment on / edit
 * the shift summary **only if** the Administrator / Super User has granted
 * comment access; otherwise the summary is view-only". The prototype extends the
 * same toggle to actions (`opComment`, `app-source.txt` 2003: operators "have
 * read-only access to comment threads — they can view every comment but cannot
 * add their own").
 *
 * Reading is open to anyone holding `action:read`. Writing asks the same
 * permission-shaped question as `summaries/[id]/comments` — see the long note
 * there for why a role-shaped gate failed open for a multi-role account.
 *
 * ⚠️ **Inference to escalate:** §6's permission table has no `action:comment`.
 * `summary:comment` is the only comment-granting permission it defines, so it is
 * what this gate reads — which is defensible (the prototype's single toggle
 * governs both surfaces) but is not something the contract states. If the
 * backend introduces `action:comment`, this is the one line that changes.
 */
const COMMENTS_DISABLED_MESSAGE =
  "Commenting is turned off by your administrator — you can view comments but cannot add them (FR-SUM-08).";

export const GET = mockRouteWithParams<{ id: string }>(
  { permission: "action:read" },
  ({ request, params }) => {
    if (!findById(mockStore().actions, params.id)) {
      return notFound(`Action ${params.id}`);
    }

    const thread = mockStore().actionComments.filter(
      (comment) => comment.action_id === params.id
    );

    return okJson(paginate(thread, new URL(request.url).searchParams));
  }
);

export const POST = mockRouteWithParams<{ id: string }>(
  { permission: "action:read" },
  async ({ request, session, params }) => {
    const mayComment =
      hasPermission(session.permissions, "summary:comment") ||
      isWorkflowEnabled("operator_comment_permission");

    if (!mayComment) return forbidden(COMMENTS_DISABLED_MESSAGE);

    if (!findById(mockStore().actions, params.id)) {
      return notFound(`Action ${params.id}`);
    }

    const body = await readJson(request, actionCommentCreateSchema);
    if (!body.ok) return body.response;

    const comment = {
      id: nextId("ACM"),
      action_id: params.id,
      author: {
        username: session.username,
        display_name: session.display_name,
      },
      body: body.data.body,
      created_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    };

    mockStore().actionComments.push(comment);
    // `COMMENT_ACTION`, not `VIEW_ACTION`. This is a write, and §9.3's store is
    // append-only, so a row labelling it a read stays wrong for ever.
    recordAudit(session, "COMMENT_ACTION", params.id);

    return okJson(comment, 201);
  }
);
