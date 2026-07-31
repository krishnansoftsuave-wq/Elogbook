import { mockRouteWithParams, notFound, okJson } from "@/mocks/handler";
import { findById, mockStore, patchById } from "@/mocks/store";

/**
 * `POST /api/v1/notifications/:id/read` — mark one notification read.
 *
 * **Scoped to the addressee.** A read receipt is per-user state (FR-NOT-01), so
 * a session may only mark its own. An earlier version let any authenticated
 * session flip `read` on a globally shared record, which changed what every
 * other user saw.
 *
 * A notification belonging to somebody else answers **404, not 403**: telling an
 * unrelated user that a given notification id exists is itself a small
 * disclosure, and there is nothing here they are entitled to know about.
 *
 * Idempotent by construction — marking an already-read notification succeeds and
 * returns the same record. **NFR-12** asks for no lost updates or duplicates
 * under concurrency, and two tabs opening the same notification must not be an
 * error.
 *
 * Not audited. FR-ADM-05 lists "sign-ins, approvals, AI questions, exports, and
 * settings changes"; a read receipt is none of those, and logging every one
 * would bury the events §9.3 actually cares about.
 */
export const POST = mockRouteWithParams<{ id: string }>(
  {},
  ({ session, params }) => {
    const notification = findById(mockStore().notifications, params.id);

    if (!notification || notification.recipient_username !== session.username) {
      return notFound(`Notification ${params.id}`);
    }

    const updated = patchById(mockStore().notifications, params.id, {
      read: true,
    });
    if (!updated) return notFound(`Notification ${params.id}`);

    return okJson(updated);
  }
);
