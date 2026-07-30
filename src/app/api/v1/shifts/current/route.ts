import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/auth/permissions";
import { authenticate, forbiddenMessage } from "@/mocks/auth/resolve";
import { MOCK_ERROR_CODES, fail, ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { mockLatency } from "@/mocks/latency";
import { currentShift } from "@/mocks/shifts/current";

/** §7: this endpoint requires `shift:read`. */
const REQUIRED_PERMISSION = "shift:read";

/**
 * `GET /api/v1/shifts/current` — §7. Auth required, permission `shift:read`.
 *
 * This is the only endpoint in the contract that gates on a permission, which
 * makes it the one that exercises §3's 403 branch: a Super User holds
 * `user:read` but not `shift:read`, so their valid token is refused *here*
 * while their session stays intact. That distinction — 401 ends the session,
 * 403 does not — is the whole reason the route exists rather than being
 * deferred with the rest of the shift feature.
 *
 * The 401 surface is `authenticate`'s, unchanged from `GET /me`; only the
 * permission check below is new.
 */
export async function GET(request: NextRequest) {
  if (!isMockApiEnabled()) {
    return NextResponse.json(mockDisabledEnvelope(), { status: 404 });
  }

  await mockLatency();

  const result = authenticate(request.headers.get("authorization"));
  if (!result.authenticated) {
    return NextResponse.json(
      fail(MOCK_ERROR_CODES.UNAUTHORIZED, result.message),
      { status: 401 }
    );
  }

  if (!hasPermission(result.session.permissions, REQUIRED_PERMISSION)) {
    // 403, not 401: §3 is explicit that the token is still valid here and the
    // frontend must keep the session and show a permission-denied state.
    return NextResponse.json(
      fail(MOCK_ERROR_CODES.FORBIDDEN, forbiddenMessage(REQUIRED_PERMISSION)),
      { status: 403 }
    );
  }

  return NextResponse.json(ok(currentShift()), { status: 200 });
}
