import { decisionCommentCreateSchema } from "@/features/decisions/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import { findById, mockStore, nextId, recordAudit } from "@/mocks/store";

/**
 * `POST /api/v1/decisions/:id/comments`.
 *
 * Not gated on the workflow toggle. §6.3(b) describes recording the decision
 * "via a **comment**", and §6.3(a)'s record-only mode still has to let Management
 * write down what they decided — a decision nobody can annotate is not a record.
 * The toggle gates routing and tracking, which live on the other two endpoints.
 */
export const POST = mockRouteWithParams<{ id: string }>(
  { permission: "analytics:read" },
  async ({ request, session, params }) => {
    const decision = findById(mockStore().decisions, params.id);
    if (!decision) return notFound(`Decision ${params.id}`);

    const body = await readJson(request, decisionCommentCreateSchema);
    if (!body.ok) return body.response;

    const comment = {
      id: nextId("DCM"),
      author: {
        username: session.username,
        display_name: session.display_name,
      },
      body: body.data.body,
      created_at: new Date().toISOString().replace(/Z$/, "+00:00"),
    };

    decision.comments.push(comment);
    // A comment on a decision, not the §6.3 decision itself.
    recordAudit(session, "COMMENT_DECISION", decision.id);

    return okJson(comment, 201);
  }
);
