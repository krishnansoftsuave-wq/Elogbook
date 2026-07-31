import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { mockRoute, okJson, paginate } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";

/**
 * `GET /api/v1/admin/notification-permissions` — **FR-NOT-01**'s per-user
 * matrix: "Allow the Administrator to control, **per user**, which notifications
 * each user is permitted to view / receive."
 *
 * Wildcard-gated: this lists every user's notification settings, which is
 * administrative data about other people.
 */
export const GET = mockRoute(
  { permission: WILDCARD_PERMISSION },
  ({ request }) =>
    okJson(
      paginate(
        mockStore().notificationPermissions,
        new URL(request.url).searchParams
      )
    )
);
