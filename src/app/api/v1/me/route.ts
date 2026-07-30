import { NextResponse, type NextRequest } from "next/server";

import { authenticate } from "@/mocks/auth/resolve";
import { MOCK_ERROR_CODES, fail, ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { mockLatency } from "@/mocks/latency";

/**
 * `GET /api/v1/me` — §5. The single source of truth for role-based UI. Every
 * 401 branch (missing header, undecodable token, expired token, groups mapping
 * to no role) is decided in `authenticate`; this only shapes the response.
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

  return NextResponse.json(ok(result.session), { status: 200 });
}
