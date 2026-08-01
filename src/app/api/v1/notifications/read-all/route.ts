import { mockRoute, okJson } from "@/mocks/handler";
import { mockStore, patchById } from "@/mocks/store";

/**
 * `POST /api/v1/notifications/read-all` — mark every one of the caller's
 * unread notifications read in a single write.
 *
 * **Scoped to the addressee**, same as `POST /:id/read` — a read receipt is
 * per-user state (FR-NOT-01), so this only ever touches the session's own
 * rows, never another user's.
 *
 * **One request, not N.** The frontend used to loop the single-notification
 * endpoint, one write per unread row: that is N requests, N cache
 * invalidations and N audit-adjacent round trips for what is conceptually one
 * action, and it can partially fail — some rows marked, some not, with no
 * atomic outcome to report back. **NFR-12** (no lost updates or duplicates
 * under concurrency) is answered here the same way `patchById` answers it
 * for one row: last write wins per field, applied within this request.
 *
 * Not audited, for the same reason `:id/read` isn't — a read receipt is none
 * of FR-ADM-05's "sign-ins, approvals, AI questions, exports, and settings
 * changes."
 */
export const POST = mockRoute({}, ({ session }) => {
  const notifications = mockStore().notifications;
  let markedCount = 0;

  for (const notification of notifications) {
    if (notification.recipient_username !== session.username) continue;
    if (notification.read) continue;

    patchById(notifications, notification.id, { read: true });
    markedCount += 1;
  }

  return okJson({ markedCount });
});
