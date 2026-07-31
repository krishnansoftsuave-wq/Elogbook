import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST as assistantFeedbackPOST } from "@/app/api/v1/assistant/feedback/route";
import { GET as healthGET } from "@/app/api/v1/health/route";
import { GET as meGET } from "@/app/api/v1/me/route";
import { GET as readyGET } from "@/app/api/v1/ready/route";
import { GET as shiftsCurrentGET } from "@/app/api/v1/shifts/current/route";
import {
  GET as summariesGET,
  POST as summariesPOST,
} from "@/app/api/v1/summaries/route";
import { POST as devTokenPOST } from "@/app/api/v1/dev/token/route";
import { currentShiftResponseSchema } from "@/features/shifts/schemas";
import { UNMAPPED_ACCOUNT_MESSAGE } from "@/mocks/auth/resolve";
import { mintMockToken } from "@/mocks/auth/token";
import { mockStore } from "@/mocks/store";

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

/**
 * **FR-HOME-04** — "Allow browsing of previous shifts, dates, and other areas."
 *
 * `from` / `to` are a PROVISIONAL addition to the Phase 0a contract: the
 * requirement is quoted, the parameter spelling is inferred. These pin the
 * behaviour so a rename is a deliberate change rather than a silent one.
 */
describe("GET /summaries — the FR-HOME-04 date range", () => {
  const listSummaries = async (query: string) => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);
    const response = await getWithAuth(
      summariesGET,
      `/summaries?pageSize=100${query}`,
      authorization
    );
    return response.json();
  };

  /** The seed spans a week of 12-hour shifts, so both bounds have rows either side. */
  const shiftDates = async (query: string): Promise<string[]> => {
    const body = await listSummaries(query);
    return body.data.items.map(
      (item: { shift_date: string }) => item.shift_date
    );
  };

  it("returns every summary when neither bound is given", async () => {
    expect((await shiftDates("")).length).toBeGreaterThan(0);
  });

  it("excludes anything before `from`, inclusively", async () => {
    const all = await shiftDates("");
    const cutoff = [...all].sort()[Math.floor(all.length / 2)] ?? "";
    const filtered = await shiftDates(`&from=${cutoff}`);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(all.length);
    for (const date of filtered) expect(date >= cutoff).toBe(true);
    // Inclusive: the boundary row itself survives.
    expect(filtered).toContain(cutoff);
  });

  it("excludes anything after `to`, inclusively", async () => {
    const all = await shiftDates("");
    const cutoff = [...all].sort()[Math.floor(all.length / 2)] ?? "";
    const filtered = await shiftDates(`&to=${cutoff}`);

    expect(filtered.length).toBeGreaterThan(0);
    for (const date of filtered) expect(date <= cutoff).toBe(true);
    expect(filtered).toContain(cutoff);
  });

  /** `<input type="date">` submits `YYYY-MM-DD`; `shift_date` is `YYYYMMDD`. */
  it("accepts the dashed spelling a date input submits", async () => {
    const all = await shiftDates("");
    const cutoff = [...all].sort()[0] ?? "";
    const dashed = `${cutoff.slice(0, 4)}-${cutoff.slice(4, 6)}-${cutoff.slice(6, 8)}`;

    expect(await shiftDates(`&from=${dashed}`)).toEqual(
      await shiftDates(`&from=${cutoff}`)
    );
  });

  it("returns an empty page rather than an error for an impossible range", async () => {
    const body = await listSummaries("&from=20990101&to=20990102");

    expect(body.success).toBe(true);
    expect(body.data.items).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  /**
   * A malformed bound is ignored rather than rejected — the same posture
   * `matchesSearch` takes for a missing `search`. The UI cannot produce one.
   */
  it("ignores a malformed bound instead of refusing the request", async () => {
    expect(await shiftDates("&from=not-a-date")).toEqual(await shiftDates(""));
    expect(await shiftDates("&to=2026")).toEqual(await shiftDates(""));
  });

  it("still applies `search` alongside the range", async () => {
    const body = await listSummaries("&search=zzzz-no-such-summary");

    expect(body.data.items).toEqual([]);
  });
});

/**
 * `useLatestSummary` reads `items[0]` of a one-row page to find the newest
 * summary, so the ordering is a contract promise rather than an artefact of the
 * seed array.
 *
 * It was neither, briefly: the handler applied no sort at all, and `POST
 * /summaries` prepends a summary whose shift is unseen — so generating one for
 * an *older* shift moved it to index 0 and silently repointed every dashboard
 * widget at a months-old shift.
 */
describe("GET /summaries — ordering", () => {
  const listSummaries = async (query = "") => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);
    const response = await getWithAuth(
      summariesGET,
      `/summaries?pageSize=100${query}`,
      authorization
    );
    return response.json();
  };

  it("returns the latest shift date first", async () => {
    const body = await listSummaries();
    const dates = body.data.items.map(
      (item: { shift_date: string }) => item.shift_date
    );

    expect(dates.length).toBeGreaterThan(1);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  /**
   * **The whole `shift_id` is deliberately not compared.** An earlier version
   * sorted on it, which puts `-N` above `-D` within a date and thereby asserts
   * that the night shift follows the day shift. The seed says otherwise: it
   * builds each record 12 hours before the last, so its Night rows are 12 hours
   * *earlier* than the Day row sharing their date, and that sort reversed them.
   *
   * Same-date records therefore keep insertion order, which is the order the
   * seed built them in — newest first. `Array.prototype.sort` has been required
   * to be stable since ES2019, so this is a guarantee rather than a habit.
   */
  it("keeps same-date shifts newest-first", async () => {
    const body = await listSummaries();
    const rows: { shift_id: string; generated_at: string }[] =
      body.data.items.map(
        (item: { shift_id: string; generated_at: string }) => ({
          shift_id: item.shift_id,
          generated_at: item.generated_at,
        })
      );

    const pairs = rows.filter(
      (row, index) =>
        index > 0 &&
        row.shift_id.slice(0, 8) === rows[index - 1]?.shift_id.slice(0, 8)
    );
    expect(pairs.length).toBeGreaterThan(0);

    /*
      Asserted on `generated_at`, not on which of D/N comes first.
      An earlier version expected `-D` before `-N` and passed only because the
      run happened to be after noon UTC: the seed steps back 12 hours per row
      from `new Date()`, so which half of the day shares a date with which flips
      with the seed hour. What holds at every hour is that insertion order is
      strictly newest-first, which is the property the stable sort preserves.
    */
    for (const [index, row] of rows.entries()) {
      const previous = rows[index - 1];
      if (
        previous &&
        previous.shift_id.slice(0, 8) === row.shift_id.slice(0, 8)
      ) {
        expect(previous.generated_at >= row.generated_at).toBe(true);
      }
    }
  });

  it("puts the newest summary first on a one-row page", async () => {
    const all = await listSummaries();
    const first = await listSummaries("&page=1");

    expect(first.data.items[0].id).toBe(all.data.items[0].id);
  });

  /**
   * The regression itself: a summary generated for an old shift must sort into
   * its own place, not to the front.
   */
  it("does not float an older shift's summary to the front when generated", async () => {
    const authorization = await bearerFor("said.albusaidi", [
      "OLNG-ELOG-OPERATORS",
    ]);
    const before = await listSummaries();
    const newestId = before.data.items[0].id;

    await summariesPOST(
      new NextRequest(`${BASE}/summaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ shift_id: "20200101-D" }),
      })
    );

    const after = await listSummaries();
    expect(after.data.items[0].id).toBe(newestId);
    // …and it is present, just not first.
    const ids = after.data.items.map((item: { id: string }) => item.id);
    expect(ids).toContain("SUM-20200101-D");
  });
});

/**
 * **FR-FB-01** — "Capture user feedback on AI answers and citations (thumbs
 * up/down with an optional comment)."
 *
 * PROVISIONAL: no feedback endpoint existed in the Phase 0a contract, so these
 * pin an inferred shape. They exist so a rename is a deliberate change.
 */
describe("POST /assistant/feedback", () => {
  const submit = async (body: unknown, username = "said.albusaidi") => {
    const groups =
      username === "yousuf.alrawahi"
        ? ["OLNG-ELOG-SUPERUSERS"]
        : ["OLNG-ELOG-OPERATORS"];
    const authorization = await bearerFor(username, groups);

    return assistantFeedbackPOST(
      new NextRequest(`${BASE}/assistant/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify(body),
      })
    );
  };

  it("records a thumbs-down on an answer (201)", async () => {
    const response = await submit({ answer_id: "ASK-0001", rating: "down" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.rating).toBe("down");
    expect(body.data.answer_id).toBe("ASK-0001");
    expect(body.data.submitted_by).toBe("said.albusaidi");
    // Null means "about the answer", not "about a citation" — the distinction
    // FR-FB-02 classifies on.
    expect(body.data.citation_record_id).toBeNull();
  });

  it("scopes feedback to one citation when given a record id", async () => {
    const response = await submit({
      answer_id: "ASK-0002",
      rating: "down",
      citation_record_id: "ACT-2041",
      comment: "That action is unrelated.",
    });
    const body = await response.json();

    expect(body.data.citation_record_id).toBe("ACT-2041");
    expect(body.data.comment).toBe("That action is unrelated.");
  });

  it("rejects a rating outside thumbs up/down (422)", async () => {
    const response = await submit({ answer_id: "ASK-0003", rating: "meh" });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
  });

  it("rejects feedback with no answer to attach it to (422)", async () => {
    const response = await submit({ answer_id: "", rating: "up" });

    expect(response.status).toBe(422);
  });

  /** Same gate as asking: every role that can ask can rate. */
  it("403s a Super User, who cannot use the assistant at all", async () => {
    const response = await submit(
      { answer_id: "ASK-0004", rating: "up" },
      "yousuf.alrawahi"
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  /**
   * §9.3 requires an immutable record of what happened. An audit row calling a
   * thumbs-down an `ASSISTANT_QUERY` would record something that did not occur.
   */
  it("audits under its own action, not ASSISTANT_QUERY", async () => {
    await submit({ answer_id: "ASK-0005", rating: "up" });

    const events = mockStore().auditEvents;
    const latest = events[events.length - 1];

    expect(latest?.action).toBe("ASSISTANT_FEEDBACK");
    expect(latest?.target).toContain("ASK-0005");
  });
});
