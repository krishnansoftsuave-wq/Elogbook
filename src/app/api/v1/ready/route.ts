import { NextResponse } from "next/server";

import { ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";

/**
 * `GET /api/v1/ready` — §7, no auth required. The checks are placeholders in
 * the real backend too ("not wired to real dependency pings yet"), so reporting
 * them as `skipped` is the contract's own answer, not a mock shortcut.
 */
export async function GET() {
  if (!isMockApiEnabled()) {
    return NextResponse.json(mockDisabledEnvelope(), { status: 404 });
  }

  return NextResponse.json(
    ok({
      status: "ready",
      checks: { db: "skipped", cache: "skipped", ai: "skipped" },
    }),
    { status: 200 }
  );
}
