import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import {
  forbidden,
  mockRouteWithParams,
  notFound,
  okJson,
} from "@/mocks/handler";
import { findById, mockStore } from "@/mocks/store";

/**
 * ⚠️ PROTOTYPE-ONLY — no BRD basis. See `features/requests/schemas.ts`.
 *
 * `GET /api/v1/requests/:id`. A submitter may read their own request; anyone
 * else needs the administrative wildcard. Without that check any authenticated
 * session could enumerate every request in the system — including "Reset MFA
 * device", which names a security event about another person.
 */
export const GET = mockRouteWithParams<{ id: string }>(
  {},
  ({ session, params }) => {
    const entry = findById(mockStore().requests, params.id);
    if (!entry) return notFound(`Request ${params.id}`);

    const isOwnRequest = entry.submitted_by.username === session.username;
    if (
      !isOwnRequest &&
      !hasPermission(session.permissions, WILDCARD_PERMISSION)
    ) {
      return forbidden("You may only view requests you submitted.");
    }

    return okJson(entry);
  }
);
