import { REQUIRED_NOTIFICATION_KINDS } from "@/features/notifications/schemas";
import { mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/notifications` — the in-app tray, FR-NOT-01.
 *
 * Authenticated but not permission-gated: every role receives notifications, and
 * there is no notification permission in `ROLE_PERMISSIONS` to gate on. What
 * governs delivery is the per-user matrix, not a role.
 *
 * **Two filters, and both are FR-NOT-01:** *"Notify users in-app and by email
 * for assigned actions, overdue actions, and report or summary availability.
 * Allow the Administrator to control, **per user**, which notifications each
 * user is permitted to view / receive."*
 *
 * 1. **Addressee** — a session sees only its own notifications. An earlier
 *    version returned the whole store to everyone, which made the tray a shared
 *    plant-wide feed and let one user's "mark read" change what everyone else
 *    saw.
 * 2. **Permission** — the `/admin/notification-permissions` matrix decides which
 *    *kinds* this user may receive in-app. A kind switched off is withheld here,
 *    at the API, rather than hidden by the client (FR-ADM-03).
 *
 * The matrix governs only the four kinds FR-NOT-01 enumerates. The prototype's
 * three extras (`comment_added`, `action_completed`, `handover_note`) have no
 * requirement behind them and therefore no row to consult, so they pass through
 * — flagged in `schemas.ts` rather than silently given a default.
 */
export const GET = mockRoute({}, ({ request, session }) => {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const store = mockStore();

  const permissions = store.notificationPermissions.find(
    (row) => row.username === session.username
  );

  const allowedKind = (kind: string): boolean => {
    const governed = REQUIRED_NOTIFICATION_KINDS.find(
      (candidate) => candidate === kind
    );
    if (!governed) return true;
    // No matrix row means nothing has been granted — fail closed.
    return permissions?.permissions[governed].in_app ?? false;
  };

  const items = store.notifications
    .filter((notification) => {
      if (notification.recipient_username !== session.username) return false;
      if (!allowedKind(notification.kind)) return false;
      if (unreadOnly && notification.read) return false;
      return true;
    })
    // Newest first, and a contract promise rather than an artefact of the seed
    // order — the same distinction `GET /summaries` had to make. The header tray
    // asks for one page of six and calls them "the newest few"; unsorted, any
    // handler appending a notification would push new ones to the *end*, so a
    // recipient with more than six would see the six oldest.
    //
    // `created_at` is ISO-8601 with a fixed offset, so a string compare is a
    // chronological one with no parsing to get wrong.
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return okJson(paginate(items, searchParams));
});
