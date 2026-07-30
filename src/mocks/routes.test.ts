import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as healthGET } from "@/app/api/v1/health/route";
import { GET as meGET } from "@/app/api/v1/me/route";
import { GET as readyGET } from "@/app/api/v1/ready/route";
import { GET as shiftsCurrentGET } from "@/app/api/v1/shifts/current/route";
import { POST as devTokenPOST } from "@/app/api/v1/dev/token/route";
import { currentShiftResponseSchema } from "@/features/shifts/schemas";
import { UNMAPPED_ACCOUNT_MESSAGE } from "@/mocks/auth/resolve";
import { mintMockToken } from "@/mocks/auth/token";

/**
 * These invoke the exported route handlers directly. That covers status codes,
 * envelopes and every branch, but it does NOT prove Next maps the URLs to these
 * files — only a request over the wire does that, and see the handoff for why
 * the dev server could not serve one while this squad is mid-flight.
 */
const BASE = "http://localhost:3000/api/v1";

const postToken = (body: unknown) =>
  devTokenPOST(
    new NextRequest(`${BASE}/dev/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const getWithAuth = (
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  authorization?: string
) =>
  handler(
    new NextRequest(`${BASE}${path}`, {
      headers: authorization ? { Authorization: authorization } : {},
    })
  );

const bearerFor = async (
  username: string,
  groups: readonly string[]
): Promise<string> => {
  const response = await postToken({ username, groups });
  const body = await response.json();
  return `Bearer ${body.data.access_token}`;
};

describe("POST /dev/token", () => {
  it("mints a token for a valid account (200)", async () => {
    const response = await postToken({
      username: "said.albusaidi",
      groups: ["OLNG-ELOG-OPERATORS"],
      display_name: "Said Al-Busaidi",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token_type).toBe("Bearer");
    expect(body.data.expires_in).toBe(900);
    expect(typeof body.data.access_token).toBe("string");
    expect(body.meta.correlation_id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("falls display_name back to username when omitted, per §4", async () => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);
    const response = await getWithAuth(meGET, "/me", authorization);
    const body = await response.json();

    expect(body.data.display_name).toBe("said.albusaidi");
  });

  it("rejects an unknown AD group with §4's 422 message", async () => {
    const response = await postToken({
      username: "hamed.alsiyabi",
      groups: ["OLNG-CONTRACTORS"],
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.message).toBe(
      "Unknown AD group(s): OLNG-CONTRACTORS. Valid groups: OLNG-ELOG-ADMINS, OLNG-ELOG-OPERATORS, OLNG-ELOG-SUPERINTENDENTS, OLNG-ELOG-SUPERUSERS, OLNG-ELOG-SUPERVISORS"
    );
  });

  it("rejects an empty groups array with a 422", async () => {
    const response = await postToken({
      username: "said.albusaidi",
      groups: [],
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details).toHaveProperty("groups");
  });

  it("rejects a missing username with a 422", async () => {
    const response = await postToken({ groups: ["OLNG-ELOG-OPERATORS"] });

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty("username");
  });

  it("rejects a body that is not JSON with a 422 rather than throwing", async () => {
    const response = await devTokenPOST(
      new NextRequest(`${BASE}/dev/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "this is not json",
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("validation_error");
  });
});

describe("GET /me", () => {
  it("returns the seven §5 fields for a valid token (200)", async () => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);
    const response = await getWithAuth(meGET, "/me", authorization);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body.data).sort()).toEqual([
      "area_scope",
      "display_name",
      "groups",
      "permissions",
      "roles",
      "subject",
      "username",
    ]);
    expect(body.data.subject).toBe("dev|said.albusaidi");
    expect(body.data.roles).toEqual(["operator"]);
    expect(body.data.area_scope).toBeNull();
  });

  it("unions permissions for the multi-group account (FR-AUTH-03)", async () => {
    const authorization = await bearerFor("maryam.alzadjali", [
      "OLNG-ELOG-OPERATORS",
      "OLNG-ELOG-SUPERINTENDENTS",
    ]);
    const body = await (await getWithAuth(meGET, "/me", authorization)).json();

    expect(body.data.roles).toEqual(["operator", "management"]);
    expect(body.data.permissions).toContain("action:write");
    expect(body.data.permissions).toContain("analytics:read");
  });

  it("returns the bare wildcard for an administrator", async () => {
    const authorization = await bearerFor("noura.alkindi", [
      "OLNG-ELOG-ADMINS",
    ]);
    const body = await (await getWithAuth(meGET, "/me", authorization)).json();

    expect(body.data.permissions).toEqual(["*"]);
  });

  it("401s when the Authorization header is absent", async () => {
    const response = await getWithAuth(meGET, "/me");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("401s for a token that cannot be decoded", async () => {
    const response = await getWithAuth(meGET, "/me", "Bearer garbage");

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });

  it("401s for an expired token", async () => {
    const expired = mintMockToken({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
      groups: ["OLNG-ELOG-OPERATORS"],
      issuedAt: Math.floor(Date.now() / 1000) - 10_000,
    });
    const response = await getWithAuth(
      meGET,
      "/me",
      `Bearer ${expired.access_token}`
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error.message).toBe(
      "Access token has expired."
    );
  });

  /**
   * The §5 deny. Its token is minted directly because §4's group validation
   * would 422 this account before it ever got one — see directory.test.ts.
   */
  it("401s with §5's deny message for an unmapped account", async () => {
    const unmapped = mintMockToken({
      username: "hamed.alsiyabi",
      displayName: "Hamed Al-Siyabi",
      groups: ["OLNG-CONTRACTORS"],
    });
    const response = await getWithAuth(
      meGET,
      "/me",
      `Bearer ${unmapped.access_token}`
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(body.error.message).toBe(UNMAPPED_ACCOUNT_MESSAGE);
    expect(body.error.message).toBe(
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
    );
  });
});

describe("GET /health and /ready", () => {
  it("reports healthy with §7's payload", async () => {
    const response = await healthGET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      status: "ok",
      service: "elogbook-backend",
      environment: "local",
    });
  });

  it("reports ready with §7's placeholder checks", async () => {
    const response = await readyGET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      status: "ready",
      checks: { db: "skipped", cache: "skipped", ai: "skipped" },
    });
  });

  it("envelopes even the unauthenticated endpoints", async () => {
    const body = await (await healthGET()).json();

    expect(body.success).toBe(true);
    expect(body.meta.correlation_id).toMatch(/^[0-9a-f]{32}$/);
    expect(body.meta.timestamp).toContain("+00:00");
  });
});

describe("GET /shifts/current", () => {
  it("returns §7's five fields for a session holding shift:read", async () => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);

    const response = await getWithAuth(
      shiftsCurrentGET,
      "/shifts/current",
      authorization
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Object.keys(body.data).sort()).toEqual([
      "ends_at",
      "label",
      "overlap_minutes",
      "shift_id",
      "starts_at",
    ]);
    expect(body.data.shift_id).toMatch(/^\d{8}-[DN]$/);
    expect(body.data.label).toMatch(/^(Day|Night)$/);
    expect(body.data.overlap_minutes).toBe(15);
    // The parse the client would run — proves the mock cannot drift from the
    // schema the app validates against.
    expect(() => currentShiftResponseSchema.parse(body)).not.toThrow();
  });

  /**
   * §3's 403 branch, and the reason this endpoint is worth mocking at all.
   * Super User holds `user:read` but not `shift:read` (§6), so its token is
   * perfectly valid and this one action is still refused.
   */
  it("403s — not 401s — for a valid token lacking shift:read", async () => {
    const authorization = await bearerFor("yousuf.alrawahi", [
      "OLNG-ELOG-SUPERUSERS",
    ]);

    const response = await getWithAuth(
      shiftsCurrentGET,
      "/shifts/current",
      authorization
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("forbidden");
    expect(body.error.message).toContain("shift:read");
  });

  it("admits an administrator through the bare wildcard", async () => {
    const authorization = await bearerFor("noura.alkindi", [
      "OLNG-ELOG-ADMINS",
    ]);

    const response = await getWithAuth(
      shiftsCurrentGET,
      "/shifts/current",
      authorization
    );

    expect(response.status).toBe(200);
  });

  it("401s when the Authorization header is absent", async () => {
    const response = await getWithAuth(shiftsCurrentGET, "/shifts/current");
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("401s with §5's deny message for an unmapped account", async () => {
    // Minted directly: §4 refuses to issue a token for an unknown group, so
    // the deny can only be reached with a token that already exists.
    const { access_token } = mintMockToken({
      username: "hamed.alsiyabi",
      displayName: "Hamed Al-Siyabi",
      groups: ["OLNG-CONTRACTORS"],
    });

    const response = await getWithAuth(
      shiftsCurrentGET,
      "/shifts/current",
      `Bearer ${access_token}`
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe(UNMAPPED_ACCOUNT_MESSAGE);
  });
});
