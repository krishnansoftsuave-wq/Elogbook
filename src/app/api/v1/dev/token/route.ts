import { NextResponse, type NextRequest } from "next/server";

import { devTokenRequestSchema } from "@/features/auth/schemas";
import { fieldErrorsFromZod } from "@/lib/zod";
import { unknownGroups, unknownGroupsMessage } from "@/mocks/auth/resolve";
import { mintMockToken } from "@/mocks/auth/token";
import { MOCK_ERROR_CODES, fail, ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { mockLatency } from "@/mocks/latency";

/**
 * `POST /api/v1/dev/token` — the §4 stub standing in for the AD FS redirect
 * until tracker A-01 lands. A thin adapter: gate, parse, delegate, envelope.
 */
export async function POST(request: NextRequest) {
  if (!isMockApiEnabled()) {
    return NextResponse.json(mockDisabledEnvelope(), { status: 404 });
  }

  await mockLatency();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      fail(
        MOCK_ERROR_CODES.VALIDATION_ERROR,
        "Request body must be valid JSON."
      ),
      { status: 422 }
    );
  }

  const parsed = devTokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFromZod(parsed.error);
    const summary = Object.entries(fieldErrors)
      .map(([field, message]) => `${field}: ${message}`)
      .join("; ");
    return NextResponse.json(
      fail(
        MOCK_ERROR_CODES.VALIDATION_ERROR,
        `Request body failed validation. ${summary}`,
        // A flat string map is what `getFieldErrors` reads back off `details`.
        fieldErrors
      ),
      { status: 422 }
    );
  }

  const unknown = unknownGroups(parsed.data.groups);
  if (unknown.length > 0) {
    return NextResponse.json(
      fail(MOCK_ERROR_CODES.VALIDATION_ERROR, unknownGroupsMessage(unknown)),
      { status: 422 }
    );
  }

  const { username, groups, display_name } = parsed.data;
  return NextResponse.json(
    ok(
      mintMockToken({
        username,
        // §4: `display_name` is optional and falls back to `username`.
        displayName: display_name ?? username,
        groups,
      })
    ),
    { status: 200 }
  );
}
