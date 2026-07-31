import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { findById, mockStore, recordAudit } from "@/mocks/store";

/**
 * `GET /api/v1/actions/:id` — one pending action, §7.6.
 *
 * The read is audited (`VIEW_ACTION`) because **FR-ADM-05** wants a full trail
 * and the prototype's own audit log shows exactly that event
 * (`app-source.txt` 1647). It is the one place a *read* writes, which is why it
 * is called out here rather than left to be noticed.
 */
export const GET = mockRouteWithParams<{ id: string }>(
  { permission: "action:read" },
  ({ session, params }) => {
    const action = findById(mockStore().actions, params.id);
    if (!action) return notFound(`Action ${params.id}`);

    recordAudit(session, "VIEW_ACTION", action.id);

    return okJson(action);
  }
);
