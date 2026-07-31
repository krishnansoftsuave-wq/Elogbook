import { NextResponse, type NextRequest } from "next/server";

import { devTokenRequestSchema } from "@/features/auth/schemas";
import { rolesForGroups } from "@/lib/auth/permissions";
import { roleLabel } from "@/constants/roles";
import { fieldErrorsFromZod } from "@/lib/zod";
import { unknownGroups, unknownGroupsMessage } from "@/mocks/auth/resolve";
import { mintMockToken } from "@/mocks/auth/token";
import { MOCK_ERROR_CODES, fail, ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { mockLatency } from "@/mocks/latency";
import { recordAuditFor } from "@/mocks/store";

/**
 * `POST /api/v1/dev/token` — the §4 stub standing in for the AD FS redirect
 * until tracker A-01 lands. A thin adapter: gate, parse, delegate, envelope.
 *
 * ## And the one place a sign-in can be audited
 *
 * **FR-ADM-05** — *"Capture a full audit trail: **sign-ins**, approvals, AI
 * questions, exports, and settings changes"* — and **§9.3** both name sign-ins
 * first. Until Phase 3b nothing emitted `LOGIN` at all, so the audit screen
 * would have shipped missing the requirement's first-named category while the
 * seed carried an `AUD-0001 … LOGIN` row implying it worked.
 *
 * **Why here and not `GET /me`.** `/me` looks like the authentication event and
 * is not: `useMe` re-runs on every rehydration with a 60-second `staleTime`, so
 * auditing there would emit a `LOGIN` per page refresh — a record of an event
 * that did not occur, which is the failure `AUDIT_ACTIONS` already rejects twice
 * in its own comments. This handler is the one that corresponds to *a person
 * authenticated*, and at cutover only this call changes.
 *
 * That it is the throwaway stub is not an objection. **Every** handler under
 * `src/app/api/` 404s in production, `/audit` included; the whole mock backend
 * is deleted at cutover. Auditing a sign-in here is exactly as durable as
 * auditing a workflow flip at `/admin/workflows`.
 *
 * ## Both refusals are audited, and that is the higher-value half
 *
 * `result` has been on `recordAudit` since Phase 0a and no call site had ever
 * passed `"failure"`, so the screen's Result column would have read as
 * decoration. A refused sign-in is what a security reviewer opens an audit log
 * to find. `hamed.alsiyabi` — in AD, entitled to nothing — makes one
 * reproducible from the sign-in screen.
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

  const { username, groups, display_name } = parsed.data;
  const displayName = display_name ?? username;

  const unknown = unknownGroups(groups);
  if (unknown.length > 0) {
    /*
      §5's deny path. The attempted username is recorded even though no role
      resolved — an audit row saying only "somebody was refused" answers none of
      the questions this log exists to answer. `role_label` is an em dash rather
      than an empty string so the column reads as "no role", matching the seed's
      System row.
    */
    recordAuditFor(
      { username, display_name: displayName },
      "—",
      "LOGIN",
      `AD FS / OAuth 2.0 — unmapped group(s): ${unknown.join(", ")}`,
      "failure"
    );

    return NextResponse.json(
      fail(MOCK_ERROR_CODES.VALIDATION_ERROR, unknownGroupsMessage(unknown)),
      { status: 422 }
    );
  }

  recordAuditFor(
    { username, display_name: displayName },
    // Derived the same way `resolveSession` will, so the log agrees with the
    // session the caller is about to hold.
    rolesForGroups(groups).map(roleLabel).join(" · "),
    "LOGIN",
    "AD FS / OAuth 2.0"
  );

  return NextResponse.json(
    ok(
      mintMockToken({
        username,
        // §4: `display_name` is optional and falls back to `username`.
        displayName,
        groups,
      })
    ),
    { status: 200 }
  );
}
