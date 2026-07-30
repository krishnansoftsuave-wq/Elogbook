import { NextResponse } from "next/server";

import { ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";

/** `GET /api/v1/health` — §7, no auth required. Payload verbatim from the contract. */
export async function GET() {
  if (!isMockApiEnabled()) {
    return NextResponse.json(mockDisabledEnvelope(), { status: 404 });
  }

  // No mockLatency here: a health probe that pretends to be slow is a liability.
  return NextResponse.json(
    ok({ status: "ok", service: "elogbook-backend", environment: "local" }),
    { status: 200 }
  );
}
