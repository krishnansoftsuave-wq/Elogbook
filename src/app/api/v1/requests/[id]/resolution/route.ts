import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { requestResolveSchema } from "@/features/requests/schemas";
import {
  mockRouteWithParams,
  notFound,
  okJson,
  readJson,
} from "@/mocks/handler";
import {
  findById,
  mockStore,
  nextId,
  patchById,
  recordAudit,
} from "@/mocks/store";

/**
 * ⚠️ PROTOTYPE-ONLY — no BRD basis. See `features/requests/schemas.ts`.
 *
 * `PATCH /api/v1/requests/:id/resolution` — an administrator resolves or rejects
 * a request, optionally with a remark (the prototype's `remarks[]`).
 */
export const PATCH = mockRouteWithParams<{ id: string }>(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session, params }) => {
    const entry = findById(mockStore().requests, params.id);
    if (!entry) return notFound(`Request ${params.id}`);

    const body = await readJson(request, requestResolveSchema);
    if (!body.ok) return body.response;

    if (body.data.remark) {
      entry.remarks.push({
        id: nextId("REM"),
        author: {
          username: session.username,
          display_name: session.display_name,
        },
        body: body.data.remark,
        created_at: new Date().toISOString().replace(/Z$/, "+00:00"),
      });
    }

    const updated = patchById(mockStore().requests, params.id, {
      status: body.data.status,
      remarks: entry.remarks,
    });
    if (!updated) return notFound(`Request ${params.id}`);

    // ⚠️ PROTOTYPE-ONLY, like `/requests` itself. `UPDATE_ROLE` was borrowed
    // because no verb fitted; resolving a request is not a role change.
    recordAudit(
      session,
      "RESOLVE_REQUEST",
      `${updated.id} → ${updated.status}`
    );

    return okJson(updated);
  }
);
