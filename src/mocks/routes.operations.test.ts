import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { PATCH as workflowsPATCH } from "@/app/api/v1/admin/workflows/route";
import { GET as actionsGET } from "@/app/api/v1/actions/route";
import { GET as actionGET } from "@/app/api/v1/actions/[id]/route";
import {
  GET as actionCommentsGET,
  POST as actionCommentsPOST,
} from "@/app/api/v1/actions/[id]/comments/route";
import { PUT as actionOwnerPUT } from "@/app/api/v1/actions/[id]/owner/route";
import { PATCH as actionStatusPATCH } from "@/app/api/v1/actions/[id]/status/route";
import { POST as assistantPOST } from "@/app/api/v1/assistant/query/route";
import { GET as auditGET } from "@/app/api/v1/audit/route";
import { POST as decisionsPOST } from "@/app/api/v1/decisions/route";
import { GET as notificationsGET } from "@/app/api/v1/notifications/route";
import { POST as notificationReadPOST } from "@/app/api/v1/notifications/[id]/read/route";
import { POST as notificationReadAllPOST } from "@/app/api/v1/notifications/read-all/route";
import { GET as suggestionsGET } from "@/app/api/v1/suggestions/route";
import { POST as suggestionConfirmPOST } from "@/app/api/v1/suggestions/[id]/confirm/route";
import {
  GET as summariesGET,
  POST as summariesPOST,
} from "@/app/api/v1/summaries/route";
import {
  actionCommentListResponseSchema,
  actionDetailResponseSchema,
  actionListResponseSchema,
  suggestionListResponseSchema,
} from "@/features/actions/schemas";
import { assistantAnswerResponseSchema } from "@/features/assistant/schemas";
import { auditListResponseSchema } from "@/features/audit/schemas";
import { notificationListResponseSchema } from "@/features/notifications/schemas";
import { summaryListResponseSchema } from "@/features/summaries/schemas";
import { mintMockToken } from "@/mocks/auth/token";
import { findById, mockStore, resetMockStore } from "@/mocks/store";

/**
 * Route handlers invoked directly, the same way `routes.test.ts` does it. That
 * covers status codes, envelopes and every branch, but it does NOT prove Next
 * maps the URLs to these files — only a request over the wire does that.
 *
 * `resetMockStore()` in `beforeEach` is mandatory: these handlers share one
 * process and one store, so a test that completes an action would otherwise leak
 * into the next test that expects it open.
 */
const BASE = "http://localhost:3000/api/v1";

const GROUPS = {
  operator: ["OLNG-ELOG-OPERATORS"],
  supervisor: ["OLNG-ELOG-SUPERVISORS"],
  management: ["OLNG-ELOG-SUPERINTENDENTS"],
  admin: ["OLNG-ELOG-ADMINS"],
  superUser: ["OLNG-ELOG-SUPERUSERS"],
  /** FR-AUTH-03's union case — and the account that broke the comment gate. */
  multiRole: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
} as const;

const ACCOUNTS = {
  operator: "said.albusaidi",
  supervisor: "fatma.alharthy",
  management: "khalid.almamari",
  admin: "noura.alkindi",
  superUser: "yousuf.alrawahi",
  multiRole: "maryam.alzadjali",
} as const;

type Persona = keyof typeof GROUPS;

const bearer = (persona: Persona): string =>
  `Bearer ${
    mintMockToken({
      username: ACCOUNTS[persona],
      displayName: ACCOUNTS[persona],
      groups: [...GROUPS[persona]],
    }).access_token
  }`;

const get = (
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  persona?: Persona
) =>
  handler(
    new NextRequest(`${BASE}${path}`, {
      headers: persona ? { Authorization: bearer(persona) } : {},
    })
  );

const withParams = <TParams extends Record<string, string>>(
  handler: (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ) => Promise<Response>,
  path: string,
  params: TParams,
  options: { persona?: Persona; method?: string; body?: unknown } = {}
) =>
  handler(
    new NextRequest(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.persona ? { Authorization: bearer(options.persona) } : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    }),
    { params: Promise.resolve(params) }
  );

const send = (
  method: "POST" | "PATCH" | "PUT",
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: unknown,
  persona?: Persona
) =>
  handler(
    new NextRequest(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    })
  );

const post = (
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: unknown,
  persona?: Persona
) => send("POST", handler, path, body, persona);

const patch = (
  handler: (request: NextRequest) => Promise<Response>,
  path: string,
  body: unknown,
  persona?: Persona
) => send("PATCH", handler, path, body, persona);

/** Flips a workflow on the way an Administrator would, through the API. */
const enableWorkflow = async (key: string) => {
  const response = await workflowsPATCH(
    new NextRequest(`${BASE}/admin/workflows`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer("admin"),
      },
      body: JSON.stringify({ key, enabled: true }),
    })
  );
  expect(response.status).toBe(200);
};

beforeEach(() => {
  resetMockStore();
});

/* -------------------------------------------------------------------------- */

describe("GET /actions", () => {
  it("returns a paginated envelope the client schema accepts", async () => {
    const response = await get(actionsGET, "/actions", "operator");
    const body = await response.json();

    expect(response.status).toBe(200);
    // The parse the client would run — this is what stops the mock and the
    // schema drifting apart.
    expect(() => actionListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.total).toBe(14);
  });

  it("401s without an Authorization header", async () => {
    const response = await get(actionsGET, "/actions");
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  });

  /**
   * §3's 403 branch. Super User holds `user:read` but not `action:read`, so the
   * token is perfectly valid and this one action is refused — the session must
   * survive. FR-ADM-03: the gate is at the API, not the button.
   */
  it("403s — not 401s — for a valid token lacking action:read", async () => {
    const response = await get(actionsGET, "/actions", "superUser");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(body.error.message).toContain("action:read");
  });

  it("paginates server-side", async () => {
    const response = await get(
      actionsGET,
      "/actions?page=2&pageSize=5",
      "operator"
    );
    const body = await response.json();

    expect(body.data.items).toHaveLength(5);
    expect(body.data.page).toBe(2);
    expect(body.data.total).toBe(14);
  });

  it("reports the true total for an out-of-range page", async () => {
    const response = await get(actionsGET, "/actions?page=99", "operator");
    const body = await response.json();

    expect(body.data.items).toHaveLength(0);
    expect(body.data.total).toBe(14);
  });

  it("filters by status", async () => {
    const response = await get(
      actionsGET,
      "/actions?status=completed",
      "operator"
    );
    const body = await response.json();

    expect(body.data.items.length).toBeGreaterThan(0);
    for (const action of body.data.items) {
      expect(action.status).toBe("completed");
    }
  });

  /** FR-PA-06 — overdue is a filter on a derived flag, not on a stored status. */
  it("filters to overdue actions without an overdue status existing", async () => {
    const response = await get(actionsGET, "/actions?overdue=true", "operator");
    const body = await response.json();

    expect(body.data.items.length).toBeGreaterThan(0);
    for (const action of body.data.items) {
      expect(Date.parse(action.due_at)).toBeLessThan(Date.now());
      expect(["completed", "cancelled", "verified"]).not.toContain(
        action.status
      );
    }
  });

  it("searches by id, title and equipment", async () => {
    const response = await get(
      actionsGET,
      "/actions?search=XV-118",
      "operator"
    );
    const body = await response.json();

    expect(body.data.items.length).toBeGreaterThan(0);
    for (const action of body.data.items) {
      expect(
        `${action.id}${action.title}${action.equipment}${action.area}`.toLowerCase()
      ).toContain("xv-118");
    }
  });
});

describe("GET /actions/:id", () => {
  it("returns one action in the §3 envelope", async () => {
    const response = await withParams(
      actionGET,
      "/actions/ACT-2041",
      {
        id: "ACT-2041",
      },
      { persona: "operator" }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => actionDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.id).toBe("ACT-2041");
  });

  it("404s for an unknown id", async () => {
    const response = await withParams(
      actionGET,
      "/actions/ACT-0000",
      {
        id: "ACT-0000",
      },
      { persona: "operator" }
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });

  /** FR-ADM-05 lists reads of a record among what the audit trail carries. */
  it("records the read in the audit trail", async () => {
    const before = mockStore().auditEvents.length;

    await withParams(
      actionGET,
      "/actions/ACT-2041",
      { id: "ACT-2041" },
      {
        persona: "operator",
      }
    );

    const events = mockStore().auditEvents;
    expect(events).toHaveLength(before + 1);
    expect(events.at(-1)?.action).toBe("VIEW_ACTION");
    expect(events.at(-1)?.target).toBe("ACT-2041");
  });
});

/* -------------------------------------------------------------------------- */
/* FR-PA-05 — the requirement this phase turns on                              */
/* -------------------------------------------------------------------------- */

describe("PATCH /actions/:id/status — FR-PA-05", () => {
  const patchStatus = (persona: Persona, status: string) =>
    withParams(
      actionStatusPATCH,
      "/actions/ACT-2041/status",
      { id: "ACT-2041" },
      { persona, method: "PATCH", body: { status } }
    );

  /**
   * The default the BRD specifies. §6.2(a): "no task is assigned to operators
   * and there is no escalation step"; FR-PA-05: tracking is available "only when
   * the Administrator enables the workflow". A Supervisor holding `action:write`
   * is still refused while the switch is off.
   */
  it("403s while the Supervisor Action Workflow is disabled", async () => {
    const response = await patchStatus("supervisor", "in_progress");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain("FR-PA-05");
    expect(findById(mockStore().actions, "ACT-2041")?.status).toBe("open");
  });

  it("succeeds once an Administrator enables the workflow", async () => {
    await enableWorkflow("supervisor_action_workflow");

    const response = await patchStatus("supervisor", "in_progress");
    expect(response.status).toBe(200);
  });

  /** The round trip that proves the store actually persisted the write. */
  it("persists the new status across a subsequent read", async () => {
    await enableWorkflow("supervisor_action_workflow");
    await patchStatus("supervisor", "completed");

    const response = await withParams(
      actionGET,
      "/actions/ACT-2041",
      {
        id: "ACT-2041",
      },
      { persona: "operator" }
    );

    expect((await response.json()).data.status).toBe("completed");
  });

  it("422s for a status outside FR-PA-04's six", async () => {
    await enableWorkflow("supervisor_action_workflow");

    const response = await patchStatus("supervisor", "Overdue");
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
  });

  it("403s for an Operator, who holds action:write but not the workflow", async () => {
    const response = await patchStatus("operator", "in_progress");
    expect(response.status).toBe(403);
  });
});

describe("PUT /actions/:id/owner — FR-PA-05 assignment", () => {
  const assign = (persona: Persona, ownerUsername: string | null) =>
    withParams(
      actionOwnerPUT,
      "/actions/ACT-2021/owner",
      { id: "ACT-2021" },
      { persona, method: "PUT", body: { owner_username: ownerUsername } }
    );

  it("403s while the workflow is disabled, citing §6.2(a)", async () => {
    const response = await assign("supervisor", ACCOUNTS.operator);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain("§6.2(a)");
    expect(findById(mockStore().actions, "ACT-2021")?.owner).toBeNull();
  });

  /**
   * Two independent gates. Even with the workflow on, only the Supervisor role
   * holds `action:assign` — the toggle answers "is this capability on", the
   * permission answers "may this person use it".
   */
  it("403s for an Operator even once the workflow is enabled", async () => {
    await enableWorkflow("supervisor_action_workflow");

    const response = await assign("operator", ACCOUNTS.operator);
    expect(response.status).toBe(403);
  });

  it("assigns for a Supervisor once the workflow is enabled", async () => {
    await enableWorkflow("supervisor_action_workflow");

    const response = await assign("supervisor", ACCOUNTS.operator);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.owner.username).toBe(ACCOUNTS.operator);
    expect(findById(mockStore().actions, "ACT-2021")?.owner?.username).toBe(
      ACCOUNTS.operator
    );
  });

  it("un-assigns on a null owner", async () => {
    await enableWorkflow("supervisor_action_workflow");
    await assign("supervisor", ACCOUNTS.operator);

    const response = await assign("supervisor", null);
    expect((await response.json()).data.owner).toBeNull();
  });

  it("404s for a user who is not in the directory", async () => {
    await enableWorkflow("supervisor_action_workflow");

    const response = await assign("supervisor", "a.harthy");
    expect(response.status).toBe(404);
  });
});

/* -------------------------------------------------------------------------- */

describe("comments — FR-SUM-08 / §6.1", () => {
  const postComment = (persona: Persona) =>
    withParams(
      actionCommentsPOST,
      "/actions/ACT-2038/comments",
      { id: "ACT-2038" },
      { persona, method: "POST", body: { body: "Checked this round." } }
    );

  it("lets anyone with action:read view the thread", async () => {
    const response = await withParams(
      actionCommentsGET,
      "/actions/ACT-2038/comments",
      { id: "ACT-2038" },
      { persona: "operator" }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => actionCommentListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.total).toBe(2);
  });

  /** §6.1: an Operator comments "only if" the Administrator granted access. */
  it("403s an Operator while operator commenting is disabled", async () => {
    const response = await postComment("operator");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain("administrator");
  });

  it("lets an Operator comment once the Administrator enables it", async () => {
    await enableWorkflow("operator_comment_permission");

    const response = await postComment("operator");
    expect(response.status).toBe(201);
  });

  /**
   * The toggle's own "Affects: Operator role" chip draws this line — a
   * Supervisor's ability to comment is not what that switch controls.
   */
  it("does not gate a Supervisor on the operator toggle", async () => {
    const response = await postComment("supervisor");
    expect(response.status).toBe(201);
  });

  it("persists the comment into the thread", async () => {
    await postComment("supervisor");

    const response = await withParams(
      actionCommentsGET,
      "/actions/ACT-2038/comments",
      { id: "ACT-2038" },
      { persona: "operator" }
    );

    expect((await response.json()).data.total).toBe(3);
  });

  /**
   * The regression this whole gate was rewritten for.
   *
   * The first version asked "is every one of this session's roles `operator`?".
   * `maryam.alzadjali` holds OPERATORS **and** SUPERINTENDENTS, so the `every()`
   * was false, the toggle check was skipped entirely, and she could comment as
   * an Operator while the Administrator had commenting switched off. It failed
   * **open** — and BRD §4 warns the role list is not final, so every future
   * custom role widened it.
   */
  it("403s a multi-role Operator while commenting is disabled (fails closed)", async () => {
    const response = await postComment("multiRole");
    expect(response.status).toBe(403);
  });

  it("403s Management, who holds summary:read but not summary:comment", async () => {
    const response = await withParams(
      actionCommentsPOST,
      "/actions/ACT-2038/comments",
      { id: "ACT-2038" },
      { persona: "management", method: "POST", body: { body: "Noted." } }
    );
    expect(response.status).toBe(403);
  });

  it("lets the multi-role account comment once the Administrator enables it", async () => {
    await enableWorkflow("operator_comment_permission");
    expect((await postComment("multiRole")).status).toBe(201);
  });

  it("422s on an empty comment", async () => {
    const response = await withParams(
      actionCommentsPOST,
      "/actions/ACT-2038/comments",
      { id: "ACT-2038" },
      { persona: "supervisor", method: "POST", body: { body: "   " } }
    );

    expect(response.status).toBe(422);
  });
});

/* -------------------------------------------------------------------------- */

describe("suggestions — FR-PA-01, FR-PA-02", () => {
  it("lists suggestions for anyone with action:read", async () => {
    const response = await get(suggestionsGET, "/suggestions", "operator");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => suggestionListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.total).toBe(3);
  });

  it("403s an Operator confirming — only a Supervisor holds action:confirm", async () => {
    const response = await withParams(
      suggestionConfirmPOST,
      "/suggestions/AI-118/confirm",
      { id: "AI-118" },
      { persona: "operator", method: "POST", body: { confirmed: true } }
    );

    expect(response.status).toBe(403);
  });

  /**
   * FR-PA-02: confirmation decides "whether each is included in the summary;
   * **no assignment to operators**". So confirming must add a summary
   * confirmation and must NOT mint a pending action — that is §6.2(b) behaviour
   * and it is off by default.
   */
  const confirm = (id: string, confirmed: boolean, comment?: string) =>
    withParams(
      suggestionConfirmPOST,
      `/suggestions/${id}/confirm`,
      { id },
      {
        persona: "supervisor",
        method: "POST",
        body: { confirmed, ...(comment ? { comment } : {}) },
      }
    );

  const confirmationsFor = (suggestionId: string) =>
    (mockStore().summaries[0]?.ai_confirmations ?? []).filter(
      (entry) => entry.suggestion_id === suggestionId
    );

  it("records the confirmation in the summary and creates no action", async () => {
    const actionsBefore = mockStore().actions.length;

    const response = await confirm(
      "AI-330",
      true,
      "Coordinate with maintenance."
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.confirmed).toBe(true);
    // FR-PA-02 / §6.2(a): confirmation writes a summary entry, never a task.
    expect(mockStore().actions).toHaveLength(actionsBefore);
    expect(confirmationsFor("AI-330")).toHaveLength(1);
  });

  /**
   * NFR-12, "no duplicate records". A double-click or a second tab must not
   * append the same confirmation twice — it previously did, because nothing tied
   * a confirmation back to its suggestion.
   */
  it("is idempotent — confirming twice records one entry", async () => {
    await confirm("AI-330", true, "First.");
    await confirm("AI-330", true, "Second.");

    const entries = confirmationsFor("AI-330");
    expect(entries).toHaveLength(1);
    // Last write wins on the comment; the record is not duplicated.
    expect(entries[0]?.comment).toBe("Second.");
  });

  it("withdraws the summary entry when a confirmation is reversed", async () => {
    await confirm("AI-330", true);
    expect(confirmationsFor("AI-330")).toHaveLength(1);

    await confirm("AI-330", false);
    expect(confirmationsFor("AI-330")).toHaveLength(0);
    expect(findById(mockStore().suggestions, "AI-330")?.confirmed).toBe(false);
  });

  it("records a rejection without adding a summary entry", async () => {
    await confirm("AI-204", false);

    expect(confirmationsFor("AI-204")).toHaveLength(0);
    expect(findById(mockStore().suggestions, "AI-204")?.confirmed).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe("summaries", () => {
  it("lists without section bodies", async () => {
    const response = await get(summariesGET, "/summaries", "operator");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => summaryListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.items[0]).not.toHaveProperty("sections");
  });

  /**
   * FR-SUM-04: "any authorised user… **without a mandatory approval gate**".
   * An Operator generating a summary must succeed.
   */
  it("lets an Operator generate one — FR-SUM-04, no approval gate", async () => {
    const before = mockStore().summaries.length;

    const response = await post(
      summariesPOST,
      "/summaries",
      { shift_id: "29991231-D" },
      "operator"
    );

    expect(response.status).toBe(201);
    expect(mockStore().summaries).toHaveLength(before + 1);
    expect((await response.json()).data.generation).toBe("on_demand");
  });

  /**
   * NFR-12, "no duplicate records". A summary id is derived from its shift, and
   * the seed already holds today's — so generating on demand used to mint a
   * colliding id whose `.find()` then permanently shadowed the seeded summary
   * along with its comments and confirmations.
   */
  it("regenerating a shift replaces it rather than duplicating the id", async () => {
    const existing = mockStore().summaries[0];
    expect(existing).toBeDefined();
    const before = mockStore().summaries.length;

    const response = await post(
      summariesPOST,
      "/summaries",
      { shift_id: existing?.shift_id },
      "operator"
    );

    expect(response.status).toBe(200);
    expect(mockStore().summaries).toHaveLength(before);

    const ids = mockStore().summaries.map((summary) => summary.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps comments and confirmations when a shift is regenerated", async () => {
    const existing = mockStore().summaries[0];
    const commentsBefore = existing?.comments.length ?? 0;
    expect(commentsBefore).toBeGreaterThan(0);

    await post(
      summariesPOST,
      "/summaries",
      { shift_id: existing?.shift_id },
      "operator"
    );

    // The AI narrative is regenerated; the human record attached to it is not.
    expect(
      findById(mockStore().summaries, existing?.id ?? "")?.comments
    ).toHaveLength(commentsBefore);
  });

  it("422s without a shift id", async () => {
    const response = await post(summariesPOST, "/summaries", {}, "operator");
    expect(response.status).toBe(422);
  });

  it("422s on a body that is not JSON", async () => {
    const response = await summariesPOST(
      new NextRequest(`${BASE}/summaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearer("operator"),
        },
        body: "this is not json",
      })
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("validation_error");
  });
});

/* -------------------------------------------------------------------------- */

describe("notifications — FR-NOT-01", () => {
  it("lists for any authenticated session, including Super User", async () => {
    const response = await get(notificationsGET, "/notifications", "superUser");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => notificationListResponseSchema.parse(body)).not.toThrow();
  });

  it("401s when unauthenticated", async () => {
    expect((await get(notificationsGET, "/notifications")).status).toBe(401);
  });

  /**
   * FR-NOT-01 is per-user. Without a recipient the tray was one shared
   * plant-wide feed: every session saw every notification, and marking one read
   * changed what everyone else saw.
   */
  it("returns only the signed-in user's own notifications", async () => {
    const response = await get(notificationsGET, "/notifications", "operator");
    const body = await response.json();

    expect(body.data.items.length).toBeGreaterThan(0);
    for (const notification of body.data.items) {
      expect(notification.recipient_username).toBe(ACCOUNTS.operator);
    }
  });

  it("does not leak another user's notifications", async () => {
    const supervisor = await (
      await get(notificationsGET, "/notifications", "supervisor")
    ).json();

    for (const notification of supervisor.data.items) {
      expect(notification.recipient_username).not.toBe(ACCOUNTS.operator);
    }
  });

  /** FR-NOT-01: the Administrator matrix decides which kinds reach a user. */
  it("withholds a kind the Administrator has not granted in-app", async () => {
    const store = mockStore();
    const row = store.notificationPermissions.find(
      (candidate) => candidate.username === ACCOUNTS.operator
    );
    expect(row?.permissions.action_assigned.in_app).toBe(true);

    const before = await (
      await get(notificationsGET, "/notifications", "operator")
    ).json();
    expect(
      before.data.items.some(
        (n: { kind: string }) => n.kind === "action_assigned"
      )
    ).toBe(true);

    if (row) row.permissions.action_assigned.in_app = false;

    const after = await (
      await get(notificationsGET, "/notifications", "operator")
    ).json();
    expect(
      after.data.items.some(
        (n: { kind: string }) => n.kind === "action_assigned"
      )
    ).toBe(false);
  });

  it("404s an attempt to mark someone else's notification read", async () => {
    // NTF-003 belongs to the Supervisor.
    const response = await withParams(
      notificationReadPOST,
      "/notifications/NTF-003/read",
      { id: "NTF-003" },
      { persona: "operator", method: "POST" }
    );

    expect(response.status).toBe(404);
    expect(findById(mockStore().notifications, "NTF-003")?.read).toBe(true);
  });

  it("filters to unread", async () => {
    const response = await get(
      notificationsGET,
      "/notifications?unread=true",
      "operator"
    );

    for (const notification of (await response.json()).data.items) {
      expect(notification.read).toBe(false);
    }
  });

  it("marks one read, and is idempotent — NFR-12", async () => {
    const first = await withParams(
      notificationReadPOST,
      "/notifications/NTF-001/read",
      { id: "NTF-001" },
      { persona: "operator", method: "POST" }
    );
    const second = await withParams(
      notificationReadPOST,
      "/notifications/NTF-001/read",
      { id: "NTF-001" },
      { persona: "operator", method: "POST" }
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).data.read).toBe(true);
  });

  /**
   * The replacement for looping `POST /:id/read` once per unread row
   * (NFR-12: N separate writes can half-fail; one write cannot). Scoped to
   * the caller the same way the single-notification endpoint is — marking
   * the Operator's inbox read must not touch the Supervisor's.
   */
  it("marks every one of the caller's unread notifications in one write, scoped to the caller", async () => {
    const operatorBefore = await (
      await get(notificationsGET, "/notifications?unread=true", "operator")
    ).json();
    const unreadCountBefore = operatorBefore.data.total;
    expect(unreadCountBefore).toBeGreaterThan(0);

    const supervisorBefore = await (
      await get(notificationsGET, "/notifications?unread=true", "supervisor")
    ).json();
    expect(supervisorBefore.data.total).toBeGreaterThan(0);

    const response = await post(
      notificationReadAllPOST,
      "/notifications/read-all",
      {},
      "operator"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.markedCount).toBe(unreadCountBefore);

    const operatorAfter = await (
      await get(notificationsGET, "/notifications?unread=true", "operator")
    ).json();
    expect(operatorAfter.data.total).toBe(0);

    // Untouched: this was the Operator's inbox, not the whole store.
    const supervisorAfter = await (
      await get(notificationsGET, "/notifications?unread=true", "supervisor")
    ).json();
    expect(supervisorAfter.data.total).toBe(supervisorBefore.data.total);
  });

  it("marking all read twice is a no-op the second time", async () => {
    await post(
      notificationReadAllPOST,
      "/notifications/read-all",
      {},
      "operator"
    );
    const second = await post(
      notificationReadAllPOST,
      "/notifications/read-all",
      {},
      "operator"
    );

    expect((await second.json()).data.markedCount).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */

describe("assistant — §7.4", () => {
  const ask = (question: string, persona: Persona = "operator") =>
    post(assistantPOST, "/assistant/query", { question }, persona);

  it("answers in the §3 envelope with structured citations (FR-AI-03)", async () => {
    const response = await ask("What happened on B-train last night?");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => assistantAnswerResponseSchema.parse(body)).not.toThrow();
    expect(body.data.citations.length).toBeGreaterThan(0);

    // FR-AI-03: shift date, timestamp and record ID, with something to click.
    for (const citation of body.data.citations) {
      expect(citation.record_id).toBeTruthy();
      expect(citation.shift_id).toBeTruthy();
      expect(citation.occurred_at).toBeTruthy();
      expect(citation.target_id).toBeTruthy();
    }
  });

  /** FR-AI-01 — the answer comes back in the language asked. */
  it("answers an Arabic question in Arabic", async () => {
    const body = await (await ask("ماذا حدث في القطار B؟")).json();

    expect(body.data.language).toBe("ar");
    expect(body.data.answer).toMatch(/[؀-ۿ]/);
  });

  it("answers an English question in English", async () => {
    const body = await (await ask("What happened on B-train?")).json();
    expect(body.data.language).toBe("en");
  });

  /** FR-AI-05 — say so rather than risk an incorrect answer. */
  it("flags low confidence when it cannot answer", async () => {
    const body = await (
      await ask("What is the catalyst loading on the reformer?")
    ).json();

    expect(body.data.low_confidence).toBe(true);
    expect(body.data.citations).toHaveLength(0);
  });

  it("does not flag a confident answer", async () => {
    const body = await (await ask("B-train compressor trip")).json();
    expect(body.data.low_confidence).toBe(false);
  });

  it("403s a Super User, who holds no assistant:query", async () => {
    expect((await ask("anything", "superUser")).status).toBe(403);
  });

  it("422s on an empty question", async () => {
    const response = await post(
      assistantPOST,
      "/assistant/query",
      { question: "   " },
      "operator"
    );
    expect(response.status).toBe(422);
  });

  /** FR-OBS-01 / FR-ADM-05 — every question is audited. */
  it("audits the question", async () => {
    const before = mockStore().auditEvents.length;
    await ask("B-train compressor trip");

    expect(mockStore().auditEvents).toHaveLength(before + 1);
    expect(mockStore().auditEvents.at(-1)?.action).toBe("ASSISTANT_QUERY");
  });
});

/* -------------------------------------------------------------------------- */

describe("decisions — §6.3", () => {
  const record = (
    ownerUsername: string | null,
    persona: Persona = "management"
  ) =>
    post(
      decisionsPOST,
      "/decisions",
      {
        title: "Defer SDV swap",
        risk: "Bearing degradation",
        detail: "Risk accepted with enhanced monitoring.",
        area: "B-train",
        equipment: "P-204",
        priority: "high",
        due_at: "2026-08-30T12:00:00+00:00",
        owner_username: ownerUsername,
      },
      persona
    );

  /**
   * §6.3(a) is the *default* and it is still a write: "record the risk and the
   * decision for future reference — no workflow is triggered". Refusing to
   * record while the workflow is off would delete the default behaviour instead
   * of implementing it.
   */
  it("records a decision with the workflow disabled", async () => {
    const before = mockStore().decisions.length;
    const response = await record(null);

    expect(response.status).toBe(201);
    expect(mockStore().decisions).toHaveLength(before + 1);
    expect((await response.json()).data.notified).toEqual([]);
  });

  it("403s an attempt to route it to an owner while the workflow is off", async () => {
    const response = await record(ACCOUNTS.operator);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain("§6.3(a)");
  });

  it("routes to an owner once the Administrator enables the workflow", async () => {
    await enableWorkflow("management_decision_workflow");

    const response = await record(ACCOUNTS.operator);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.owner.username).toBe(ACCOUNTS.operator);
    expect(body.data.notified).toHaveLength(1);
  });

  it("403s an Operator — decisions need analytics:read", async () => {
    expect((await record(null, "operator")).status).toBe(403);
  });
});

/* -------------------------------------------------------------------------- */

describe("audit — §7.11, FR-OBS-01", () => {
  it("403s a non-administrator", async () => {
    expect((await get(auditGET, "/audit", "operator")).status).toBe(403);
  });

  it("returns the trail newest-first for an administrator", async () => {
    const response = await get(auditGET, "/audit", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => auditListResponseSchema.parse(body)).not.toThrow();

    const times = body.data.items.map((event: { occurred_at: string }) =>
      Date.parse(event.occurred_at)
    );
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  /**
   * FR-OBS-01 requires append-only storage. The frontend contract enforces that
   * by offering no way in: the route module exports a GET and nothing else.
   */
  it("exposes no mutation verb at all", async () => {
    const route = await import("@/app/api/v1/audit/route");

    expect(Object.keys(route)).toEqual(["GET"]);
  });

  it("grows as the demo is used", async () => {
    const before = (await (await get(auditGET, "/audit", "admin")).json()).data
      .total;

    await withParams(
      actionGET,
      "/actions/ACT-2041",
      { id: "ACT-2041" },
      {
        persona: "operator",
      }
    );

    const after = (await (await get(auditGET, "/audit", "admin")).json()).data
      .total;
    expect(after).toBe(before + 1);
  });
});

/* -------------------------------------------------------------------------- */

describe("admin workflows", () => {
  it("is readable by any authenticated session so screens can gate on it", async () => {
    const { GET } = await import("@/app/api/v1/admin/workflows/route");
    const response = await get(GET, "/admin/workflows", "operator");

    expect(response.status).toBe(200);
    expect((await response.json()).data.items).toHaveLength(4);
  });

  it("403s a non-administrator trying to flip one", async () => {
    const response = await patch(
      workflowsPATCH,
      "/admin/workflows",
      { key: "supervisor_action_workflow", enabled: true },
      "supervisor"
    );

    expect(response.status).toBe(403);
  });

  it("audits the change — FR-ADM-05 'settings changes'", async () => {
    const before = mockStore().auditEvents.length;
    await enableWorkflow("supervisor_action_workflow");

    expect(mockStore().auditEvents).toHaveLength(before + 1);
    expect(mockStore().auditEvents.at(-1)?.action).toBe("UPDATE_WORKFLOW");
  });

  it("422s an unknown workflow key", async () => {
    const response = await patch(
      workflowsPATCH,
      "/admin/workflows",
      { key: "nonexistent_workflow", enabled: true },
      "admin"
    );

    expect(response.status).toBe(422);
  });
});
