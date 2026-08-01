import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  DELETE as roleDELETE,
  GET as roleGET,
  PUT as rolePUT,
} from "@/app/api/v1/admin/roles/[id]/route";
import {
  GET as rolesGET,
  POST as rolesPOST,
} from "@/app/api/v1/admin/roles/route";
import { GET as notificationPermissionsGET } from "@/app/api/v1/admin/notification-permissions/route";
import { PUT as notificationPermissionPUT } from "@/app/api/v1/admin/notification-permissions/[username]/route";
import {
  GET as shiftConfigGET,
  PUT as shiftConfigPUT,
} from "@/app/api/v1/admin/shift-config/route";
import {
  GET as workflowsGET,
  PATCH as workflowsPATCH,
} from "@/app/api/v1/admin/workflows/route";
import { GET as auditGET } from "@/app/api/v1/audit/route";
import { POST as devTokenPOST } from "@/app/api/v1/dev/token/route";
import { GET as shiftsCurrentGET } from "@/app/api/v1/shifts/current/route";
import { GET as usersGET } from "@/app/api/v1/users/route";
import {
  GET as userGET,
  PATCH as userPATCH,
} from "@/app/api/v1/users/[username]/route";
import {
  EMPTY_MODULE_PERMISSIONS,
  notificationPermissionDetailResponseSchema,
  notificationPermissionListResponseSchema,
  roleDetailResponseSchema,
  roleListResponseSchema,
  shiftConfigResponseSchema,
  workflowDetailResponseSchema,
  workflowListResponseSchema,
} from "@/features/admin/schemas";
import { auditListResponseSchema } from "@/features/audit/schemas";
import {
  userDetailResponseSchema,
  userListResponseSchema,
} from "@/features/users/schemas";
import { mintMockToken } from "@/mocks/auth/token";
import { appendAuditEvent, mockStore, resetMockStore } from "@/mocks/store";

/**
 * The administration surface — **FR-ADM-01** (the directory) and §6.4 (the four
 * workflow switches).
 *
 * Handlers are invoked directly, as in `routes.operations.test.ts`. That covers
 * status codes, envelopes and every branch, but it does NOT prove Next maps the
 * URLs to these files — only a request over the wire does, which is `e2e/`'s job.
 *
 * `resetMockStore()` in `beforeEach` is mandatory: suspending a user and
 * enabling a workflow are both one-way changes to a store shared by the whole
 * process.
 */
const BASE = "http://localhost:3000/api/v1";

const GROUPS = {
  operator: ["OLNG-ELOG-OPERATORS"],
  admin: ["OLNG-ELOG-ADMINS"],
  superUser: ["OLNG-ELOG-SUPERUSERS"],
} as const;

const ACCOUNTS = {
  operator: "said.albusaidi",
  admin: "noura.alkindi",
  superUser: "yousuf.alrawahi",
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

const patchUser = (
  username: string,
  body: unknown,
  persona?: Persona
): Promise<Response> =>
  userPATCH(
    new NextRequest(`${BASE}/users/${username}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ username }) }
  );

const getUser = (username: string, persona?: Persona): Promise<Response> =>
  userGET(
    new NextRequest(`${BASE}/users/${username}`, {
      headers: persona ? { Authorization: bearer(persona) } : {},
    }),
    { params: Promise.resolve({ username }) }
  );

const patchWorkflow = (body: unknown, persona?: Persona): Promise<Response> =>
  workflowsPATCH(
    new NextRequest(`${BASE}/admin/workflows`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    })
  );

const putShiftConfig = (body: unknown, persona?: Persona): Promise<Response> =>
  shiftConfigPUT(
    new NextRequest(`${BASE}/admin/shift-config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    })
  );

const putNotificationPermission = (
  username: string,
  body: unknown,
  persona?: Persona
): Promise<Response> =>
  notificationPermissionPUT(
    new NextRequest(`${BASE}/admin/notification-permissions/${username}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ username }) }
  );

const deleteRole = (id: string, persona?: Persona): Promise<Response> =>
  roleDELETE(
    new NextRequest(`${BASE}/admin/roles/${id}`, {
      method: "DELETE",
      headers: persona ? { Authorization: bearer(persona) } : {},
    }),
    { params: Promise.resolve({ id }) }
  );

const getRole = (id: string, persona?: Persona): Promise<Response> =>
  roleGET(
    new NextRequest(`${BASE}/admin/roles/${id}`, {
      headers: persona ? { Authorization: bearer(persona) } : {},
    }),
    { params: Promise.resolve({ id }) }
  );

const postRole = (body: unknown, persona?: Persona): Promise<Response> =>
  rolesPOST(
    new NextRequest(`${BASE}/admin/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    })
  );

const putRole = (
  id: string,
  body: unknown,
  persona?: Persona
): Promise<Response> =>
  rolePUT(
    new NextRequest(`${BASE}/admin/roles/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );

const postToken = (body: unknown): Promise<Response> =>
  devTokenPOST(
    new NextRequest(`${BASE}/dev/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

/** The newest row, since `appendAuditEvent` pushes. */
const latestAudit = () => mockStore().auditEvents.at(-1);

beforeEach(() => {
  resetMockStore();
});

/* -------------------------------------------------------------------------- */
/* GET /users — FR-ADM-01                                                      */
/* -------------------------------------------------------------------------- */

describe("GET /users", () => {
  it("returns a paginated envelope the client schema accepts", async () => {
    const response = await get(usersGET, "/users", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    // The parse the client runs — what stops the mock and the schema drifting.
    expect(() => userListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.total).toBe(7);
  });

  /**
   * §6.5: the Super User *"Can view users."* Reading is not Administrator-only,
   * and this is the assertion that keeps `user:read` from quietly becoming so.
   */
  it("admits a Super User, who holds user:read", async () => {
    const response = await get(usersGET, "/users", "superUser");
    expect(response.status).toBe(200);
  });

  it("refuses a role that does not hold user:read with a 403", async () => {
    const response = await get(usersGET, "/users", "operator");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("refuses an unauthenticated request with a 401", async () => {
    const response = await get(usersGET, "/users");
    expect(response.status).toBe(401);
  });

  /**
   * The directory is seeded by projecting `MOCK_ACCOUNTS` through
   * `rolesForGroups`, so everyone AD knows is listed — including the account
   * whose groups map to nothing, which is precisely §5's deny case. A directory
   * that hid them would hide the problem an Administrator has to fix.
   */
  it("lists the unmapped account, with no roles", async () => {
    const response = await get(usersGET, "/users?pageSize=100", "admin");
    const { items } = (await response.json()).data;
    const unmapped = items.find(
      (user: { username: string }) => user.username === "hamed.alsiyabi"
    );

    expect(unmapped).toBeDefined();
    expect(unmapped.roles).toEqual([]);
    expect(unmapped.ad_groups).toEqual(["OLNG-CONTRACTORS"]);
  });

  it("sorts by display name, not by fixture order", async () => {
    const response = await get(usersGET, "/users?pageSize=100", "admin");
    const names = (await response.json()).data.items.map(
      (user: { display_name: string }) => user.display_name
    );

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  /**
   * **FR-AUTH-03** — a person may hold several roles, so filtering by one is a
   * *contains*. `maryam.alzadjali` is in two AD groups precisely so an equals
   * would fail here.
   */
  it("matches a role a multi-role user holds among several", async () => {
    const response = await get(usersGET, "/users?role=management", "admin");
    const usernames = (await response.json()).data.items.map(
      (user: { username: string }) => user.username
    );

    expect(usernames).toContain("maryam.alzadjali");
    expect(usernames).toContain("khalid.almamari");
    expect(usernames).not.toContain("said.albusaidi");
  });

  it("searches username as well as display name", async () => {
    const byUsername = await get(usersGET, "/users?search=alkindi", "admin");
    const byDisplayName = await get(usersGET, "/users?search=Noura", "admin");

    expect((await byUsername.json()).data.items).toHaveLength(1);
    expect((await byDisplayName.json()).data.items).toHaveLength(1);
  });

  it("filters by platform access status", async () => {
    await patchUser("said.albusaidi", { status: "suspended" }, "admin");

    const suspended = await get(usersGET, "/users?status=suspended", "admin");
    const body = await suspended.json();

    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].username).toBe("said.albusaidi");
  });
});

/* -------------------------------------------------------------------------- */
/* GET|PATCH /users/:username                                                  */
/* -------------------------------------------------------------------------- */

describe("GET /users/:username", () => {
  it("returns one person in an envelope the client schema accepts", async () => {
    const response = await getUser("noura.alkindi", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => userDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.display_name).toBe("Noura Al-Kindi");
  });

  it("404s an unknown username", async () => {
    const response = await getUser("nobody.here", "admin");

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });
});

describe("PATCH /users/:username", () => {
  it("suspends platform access and answers with the updated record", async () => {
    const response = await patchUser(
      "said.albusaidi",
      { status: "suspended" },
      "admin"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => userDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.status).toBe("suspended");
  });

  it("restores access again — suspending is not a one-way door", async () => {
    await patchUser("said.albusaidi", { status: "suspended" }, "admin");
    const response = await patchUser(
      "said.albusaidi",
      { status: "active" },
      "admin"
    );

    expect((await response.json()).data.status).toBe("active");
  });

  /**
   * §6.5 gives the Super User *"Can view users"* — not manage them. This is the
   * first place the two admin-tree roles genuinely diverge, and the API half of
   * **FR-ADM-03** is this assertion.
   */
  it("refuses a Super User with a 403 even though they may read the list", async () => {
    const readResponse = await get(usersGET, "/users", "superUser");
    const writeResponse = await patchUser(
      "said.albusaidi",
      { status: "suspended" },
      "superUser"
    );

    expect(readResponse.status).toBe(200);
    expect(writeResponse.status).toBe(403);
  });

  /**
   * **FR-AUTH-02** makes AD the system of record for names, groups and roles. A
   * plain `z.object` would strip these and answer 200, so a client editing AD's
   * data would believe it had worked. The strict object names the field instead.
   */
  it.each(["roles", "ad_groups", "display_name"])(
    "rejects %s rather than silently ignoring it",
    async (field) => {
      const response = await patchUser(
        "said.albusaidi",
        { status: "active", [field]: ["anything"] },
        "admin"
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe("validation_error");
      expect(body.error.details).toHaveProperty(field);
    }
  );

  it("rejects a status outside the two the platform has", async () => {
    const response = await patchUser(
      "said.albusaidi",
      { status: "invited" },
      "admin"
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty("status");
  });

  it("404s an unknown username before it looks at the body", async () => {
    // A nonsense status: if the 404 did not come first this would be a 422.
    const response = await patchUser(
      "nobody.here",
      { status: "nonsense" },
      "admin"
    );
    expect(response.status).toBe(404);
  });

  it("refuses an unauthenticated write with a 401", async () => {
    const response = await patchUser("said.albusaidi", { status: "suspended" });
    expect(response.status).toBe(401);
  });

  /**
   * **FR-ADM-05** lists "settings changes" among what the audit trail must
   * carry, and access is the setting with the widest blast radius.
   */
  it("writes an audit entry naming who changed what", async () => {
    const before = mockStore().auditEvents.length;
    await patchUser("said.albusaidi", { status: "suspended" }, "admin");

    const events = mockStore().auditEvents;
    // `appendAuditEvent` pushes, so the newest sits last.
    const latest = events.at(-1);
    expect(events).toHaveLength(before + 1);
    // Not `UPDATE_ROLE`: this endpoint cannot change a role, and §9.3's log is
    // immutable — a row naming an event that did not happen stays wrong.
    expect(latest?.action).toBe("UPDATE_USER_ACCESS");
    expect(latest?.target).toContain("said.albusaidi");
    expect(latest?.target).toContain("suspended");
    expect(latest?.actor?.username).toBe("noura.alkindi");
  });
});

/* -------------------------------------------------------------------------- */
/* GET|PATCH /admin/workflows — §6.4                                           */
/* -------------------------------------------------------------------------- */

describe("GET /admin/workflows", () => {
  it("returns all four switches, every one of them off", async () => {
    const response = await get(workflowsGET, "/admin/workflows", "operator");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => workflowListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.items).toHaveLength(4);
    expect(
      body.data.items.every((item: { enabled: boolean }) => !item.enabled)
    ).toBe(true);
  });

  /**
   * Deliberately open to any authenticated session. Every screen that shows or
   * hides a gated control reads these, and an Operator's UI cannot ask an
   * admin-only endpoint. Switch positions are policy, not data.
   */
  it("is readable by a non-admin, because every screen needs it", async () => {
    const response = await get(workflowsGET, "/admin/workflows", "operator");
    expect(response.status).toBe(200);
  });

  it("still requires a session", async () => {
    const response = await get(workflowsGET, "/admin/workflows");
    expect(response.status).toBe(401);
  });
});

describe("PATCH /admin/workflows", () => {
  it("enables a switch and answers with the record it changed", async () => {
    const response = await patchWorkflow(
      { key: "supervisor_action_workflow", enabled: true },
      "admin"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => workflowDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.key).toBe("supervisor_action_workflow");
    expect(body.data.enabled).toBe(true);
  });

  /**
   * **The permission is per switch, not per route.**
   *
   * §6.5's fourth bullet, the §4 role table, **FR-ADM-06** and **FR-DASH-03**
   * all say the Super User controls *"access to comments and the decision
   * workflow"* — while **FR-PA-05** reserves action assignment to the
   * *"Administrator"*. An earlier build gated the whole endpoint on the wildcard
   * and denied the Super User a capability the BRD grants four times over.
   */
  it.each([
    "operator_comment_permission",
    "management_decision_workflow",
  ] as const)("lets a Super User control %s", async (key) => {
    const response = await patchWorkflow({ key, enabled: true }, "superUser");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.enabled).toBe(true);
  });

  it.each(["supervisor_action_workflow", "predictive_insights"] as const)(
    "refuses a Super User %s, which is the Administrator's",
    async (key) => {
      const response = await patchWorkflow({ key, enabled: true }, "superUser");
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.message).toContain(key);
    }
  );

  it("lets an Administrator control all four", async () => {
    for (const key of [
      "operator_comment_permission",
      "supervisor_action_workflow",
      "management_decision_workflow",
      "predictive_insights",
    ]) {
      const response = await patchWorkflow({ key, enabled: true }, "admin");
      expect(response.status).toBe(200);
    }
  });

  it("refuses an operator every switch", async () => {
    const response = await patchWorkflow(
      { key: "operator_comment_permission", enabled: true },
      "operator"
    );

    expect(response.status).toBe(403);
  });

  /**
   * The body is validated before the permission is checked, so an unknown key is
   * a 422 naming the field rather than a 403 claiming somebody lacks a
   * permission for a switch that does not exist.
   */
  it("answers 422, not 403, for an unknown key from an unprivileged session", async () => {
    const response = await patchWorkflow(
      { key: "made_up_switch", enabled: true },
      "operator"
    );

    expect(response.status).toBe(422);
  });

  it("rejects a key outside the four", async () => {
    const response = await patchWorkflow(
      { key: "made_up_switch", enabled: true },
      "admin"
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty("key");
  });

  it("writes an audit entry naming the switch and its new position", async () => {
    await patchWorkflow(
      { key: "operator_comment_permission", enabled: true },
      "admin"
    );

    const latest = mockStore().auditEvents.at(-1);
    expect(latest?.action).toBe("UPDATE_WORKFLOW");
    expect(latest?.target).toContain("operator_comment_permission");
    expect(latest?.target).toContain("enabled");
  });
});

/* -------------------------------------------------------------------------- */
/* GET|PUT /admin/shift-config — FR-HOME-03                                    */
/* -------------------------------------------------------------------------- */

const SHIFT_CONFIG = {
  day_start: "07:00",
  day_end: "19:00",
  night_start: "19:00",
  night_end: "07:00",
  overlap_minutes: 30,
} as const;

describe("GET /admin/shift-config", () => {
  it("returns the seeded boundary in an envelope the client accepts", async () => {
    const response = await get(shiftConfigGET, "/admin/shift-config", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => shiftConfigResponseSchema.parse(body)).not.toThrow();
    expect(body.data.day_start).toBe("06:00");
    expect(body.data.overlap_minutes).toBe(15);
  });

  /**
   * Deliberately open to any authenticated session: the boundary is not a
   * secret, and it decides what "this shift" means on every screen.
   */
  it("is readable by a non-admin", async () => {
    const response = await get(
      shiftConfigGET,
      "/admin/shift-config",
      "operator"
    );
    expect(response.status).toBe(200);
  });
});

describe("PUT /admin/shift-config", () => {
  it("stores the new boundary", async () => {
    const response = await putShiftConfig(SHIFT_CONFIG, "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.day_start).toBe("07:00");
    expect(mockStore().shiftConfig.overlap_minutes).toBe(30);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await putShiftConfig(SHIFT_CONFIG, "superUser");
    expect(response.status).toBe(403);
  });

  it("rejects a clock time that is not 24-hour HH:MM", async () => {
    const response = await putShiftConfig(
      { ...SHIFT_CONFIG, day_start: "7am" },
      "admin"
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty("day_start");
  });

  /**
   * **FR-HOME-03** — "The Administrator can change shift timings, and
   * report/summary generation aligns to them." Before Phase 3b the value was
   * stored and then ignored: `GET /shifts/current` computed from module
   * constants. This is the assertion that the wiring exists.
   */
  it("moves the boundary GET /shifts/current reports", async () => {
    /*
      Asserted as a **plant wall-clock time**, not as an absolute instant.
      Whether the live shift is Day or Night depends on when the suite runs, so
      pinning `T02:00:00` would pass only between 06:00 and 18:00 GST — the
      class of time-dependent test that goes red for whoever runs it next.
    */
    const plantTime = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Muscat",
    });
    const startsAt = async (response: Response) =>
      plantTime.format(new Date((await response.json()).data.starts_at));

    const before = await get(shiftsCurrentGET, "/shifts/current", "operator");
    // The seeded boundary: whichever half we are in, it opened on the hour.
    expect(["06:00", "18:00"]).toContain(await startsAt(before));

    await putShiftConfig(SHIFT_CONFIG, "admin");

    const after = await get(shiftsCurrentGET, "/shifts/current", "operator");
    expect(["07:00", "19:00"]).toContain(await startsAt(after));

    const again = await get(shiftsCurrentGET, "/shifts/current", "operator");
    expect((await again.json()).data.overlap_minutes).toBe(30);
  });

  it("audits under its own verb, not the workflow switch's", async () => {
    await putShiftConfig(SHIFT_CONFIG, "admin");

    expect(latestAudit()?.action).toBe("UPDATE_SHIFT_CONFIG");
    expect(latestAudit()?.target).toContain("07:00");
  });
});

/* -------------------------------------------------------------------------- */
/* GET|PUT /admin/notification-permissions — §6.4 / FR-NOT-01                  */
/* -------------------------------------------------------------------------- */

const ALL_OFF_PERMISSIONS = {
  action_assigned: { in_app: false, email: false },
  action_overdue: { in_app: false, email: false },
  summary_ready: { in_app: false, email: false },
  report_ready: { in_app: false, email: false },
};

describe("GET /admin/notification-permissions", () => {
  it("returns a paginated envelope the client schema accepts", async () => {
    const response = await get(
      notificationPermissionsGET,
      "/admin/notification-permissions",
      "admin"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() =>
      notificationPermissionListResponseSchema.parse(body)
    ).not.toThrow();
    expect(body.data.total).toBeGreaterThan(0);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await get(
      notificationPermissionsGET,
      "/admin/notification-permissions",
      "superUser"
    );
    expect(response.status).toBe(403);
  });

  it("refuses an operator with a 403", async () => {
    const response = await get(
      notificationPermissionsGET,
      "/admin/notification-permissions",
      "operator"
    );
    expect(response.status).toBe(403);
  });

  it("refuses an unauthenticated request with a 401", async () => {
    const response = await get(
      notificationPermissionsGET,
      "/admin/notification-permissions"
    );
    expect(response.status).toBe(401);
  });
});

describe("PUT /admin/notification-permissions/:username", () => {
  it("replaces the user's permission map and answers with the updated record", async () => {
    const response = await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: ALL_OFF_PERMISSIONS },
      "admin"
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() =>
      notificationPermissionDetailResponseSchema.parse(body)
    ).not.toThrow();
    expect(body.data.permissions).toEqual(ALL_OFF_PERMISSIONS);
  });

  it("appears in a subsequent GET, not just the mutation's own response", async () => {
    await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: ALL_OFF_PERMISSIONS },
      "admin"
    );

    const response = await get(
      notificationPermissionsGET,
      "/admin/notification-permissions",
      "admin"
    );
    const { items } = (await response.json()).data;
    const row = items.find(
      (candidate: { username: string }) =>
        candidate.username === ACCOUNTS.operator
    );

    expect(row.permissions).toEqual(ALL_OFF_PERMISSIONS);
  });

  it("404s an unknown username", async () => {
    const response = await putNotificationPermission(
      "nobody.here",
      { permissions: ALL_OFF_PERMISSIONS },
      "admin"
    );
    expect(response.status).toBe(404);
  });

  /**
   * §6.4 names this an Administrator capability; §6.5's five Super User
   * bullets say nothing about it — unlike the two workflow switches the Super
   * User does control, this one has no split ownership to test for.
   */
  it("refuses a Super User with a 403", async () => {
    const response = await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: ALL_OFF_PERMISSIONS },
      "superUser"
    );
    expect(response.status).toBe(403);
  });

  it("refuses an operator with a 403", async () => {
    const response = await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: ALL_OFF_PERMISSIONS },
      "operator"
    );
    expect(response.status).toBe(403);
  });

  it("refuses an unauthenticated request with a 401", async () => {
    const response = await putNotificationPermission(ACCOUNTS.operator, {
      permissions: ALL_OFF_PERMISSIONS,
    });
    expect(response.status).toBe(401);
  });

  it("rejects a body missing a notification key", async () => {
    const { action_assigned: _omit, ...incomplete } = ALL_OFF_PERMISSIONS;
    const response = await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: incomplete },
      "admin"
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty(
      "permissions.action_assigned"
    );
  });

  it("writes an audit entry naming the user whose permissions changed", async () => {
    await putNotificationPermission(
      ACCOUNTS.operator,
      { permissions: ALL_OFF_PERMISSIONS },
      "admin"
    );

    expect(latestAudit()?.action).toBe("UPDATE_NOTIFICATION_PERMISSION");
    expect(latestAudit()?.target).toBe(ACCOUNTS.operator);
  });
});

/* -------------------------------------------------------------------------- */
/* GET /admin/roles, DELETE /admin/roles/:id — §6 / FR-ADM-02                  */
/* -------------------------------------------------------------------------- */

describe("GET /admin/roles", () => {
  it("returns a paginated envelope the client schema accepts", async () => {
    const response = await get(rolesGET, "/admin/roles", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => roleListResponseSchema.parse(body)).not.toThrow();
    expect(body.data.total).toBe(10);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await get(rolesGET, "/admin/roles", "superUser");
    expect(response.status).toBe(403);
  });

  it("refuses an operator with a 403", async () => {
    const response = await get(rolesGET, "/admin/roles", "operator");
    expect(response.status).toBe(403);
  });

  it("refuses an unauthenticated request with a 401", async () => {
    const response = await get(rolesGET, "/admin/roles");
    expect(response.status).toBe(401);
  });
});

describe("GET /admin/roles/:id", () => {
  it("returns one role in an envelope the client schema accepts", async () => {
    const response = await getRole("ROLE-0007", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => roleDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.name).toBe("Shutdown Coordinator");
  });

  it("404s an unknown role id", async () => {
    const response = await getRole("ROLE-9999", "admin");
    expect(response.status).toBe(404);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await getRole("ROLE-0007", "superUser");
    expect(response.status).toBe(403);
  });
});

/** §6 / FR-ADM-02, §9.1: "specific module permissions ..., data scope ..., and AD-group mapping". */
const NEW_ROLE_BODY = {
  name: "Safety Auditor",
  permissions: {
    ...EMPTY_MODULE_PERMISSIONS,
    assistant: { view: true, generate: false, approve: false, export: false },
  },
  data_scope: "full_plant",
  ad_group: "ELOGBOOK_SAFETY_AUDITOR",
} as const;

describe("POST /admin/roles", () => {
  it("creates a custom role, live and with zero members", async () => {
    const response = await postRole(NEW_ROLE_BODY, "admin");
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(() => roleDetailResponseSchema.parse(body)).not.toThrow();
    expect(body.data.type).toBe("custom");
    expect(body.data.member_count).toBe(0);
    expect(body.data.ad_group).toBe("ELOGBOOK_SAFETY_AUDITOR");
  });

  it("appends to the list a subsequent GET returns", async () => {
    await postRole(NEW_ROLE_BODY, "admin");

    const response = await get(rolesGET, "/admin/roles?pageSize=100", "admin");
    const { items } = (await response.json()).data;

    expect(
      items.some((role: { name: string }) => role.name === "Safety Auditor")
    ).toBe(true);
  });

  it("rejects a role name under two characters", async () => {
    const response = await postRole({ ...NEW_ROLE_BODY, name: "A" }, "admin");

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toHaveProperty("name");
  });

  it("refuses a Super User with a 403", async () => {
    const response = await postRole(NEW_ROLE_BODY, "superUser");
    expect(response.status).toBe(403);
  });

  it("refuses an unauthenticated request with a 401", async () => {
    const response = await postRole(NEW_ROLE_BODY);
    expect(response.status).toBe(401);
  });

  it("writes an audit entry naming the created role", async () => {
    await postRole(NEW_ROLE_BODY, "admin");

    expect(latestAudit()?.action).toBe("CREATE_ROLE");
    expect(latestAudit()?.target).toContain("Safety Auditor");
  });
});

describe("PUT /admin/roles/:id", () => {
  /**
   * ROLE-0008, Turnaround Lead — a genuinely Administrator-created custom
   * role. Shutdown Coordinator (ROLE-0007) is a §6.6 baseline role and
   * therefore `base`, so it cannot stand in for the custom-role write path.
   */
  const UPDATE_BODY = {
    name: "Turnaround Lead",
    permissions: EMPTY_MODULE_PERMISSIONS,
    data_scope: "area_restricted",
    ad_group: "ELOGBOOK_TA_LEAD",
  } as const;

  it("updates a custom role and answers with the record it changed", async () => {
    const response = await putRole("ROLE-0008", UPDATE_BODY, "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.data_scope).toBe("area_restricted");
  });

  it("leaves member_count and type untouched by the write", async () => {
    await putRole("ROLE-0008", UPDATE_BODY, "admin");

    const role = mockStore().roles.find(
      (candidate) => candidate.id === "ROLE-0008"
    );
    expect(role?.member_count).toBe(1);
    expect(role?.type).toBe("custom");
  });

  /**
   * ROLE-0001 is Operator, a base role. FR-AUTH-02 only pins its AD group
   * mapping — name, permissions and data scope still write through even
   * though `UPDATE_BODY` asks for a different `ad_group`.
   */
  it("updates a base role's name, permissions and data scope but pins its AD group", async () => {
    const response = await putRole("ROLE-0001", UPDATE_BODY, "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe("Turnaround Lead");
    expect(body.data.data_scope).toBe("area_restricted");
    expect(body.data.ad_group).toBe("ELOGBOOK_OPERATOR");
  });

  it("leaves member_count and type untouched by a base role write", async () => {
    await putRole("ROLE-0001", UPDATE_BODY, "admin");

    const role = mockStore().roles.find(
      (candidate) => candidate.id === "ROLE-0001"
    );
    expect(role?.member_count).toBe(24);
    expect(role?.type).toBe("base");
  });

  it("404s an unknown role id", async () => {
    const response = await putRole("ROLE-9999", UPDATE_BODY, "admin");
    expect(response.status).toBe(404);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await putRole("ROLE-0008", UPDATE_BODY, "superUser");
    expect(response.status).toBe(403);
  });

  it("writes an audit entry naming the updated role", async () => {
    await putRole("ROLE-0008", UPDATE_BODY, "admin");

    expect(latestAudit()?.action).toBe("UPDATE_ROLE");
    expect(latestAudit()?.target).toBe("Turnaround Lead");
  });
});

describe("DELETE /admin/roles/:id", () => {
  it("404s an unknown role id", async () => {
    const response = await deleteRole("ROLE-9999", "admin");
    expect(response.status).toBe(404);
  });

  /** ROLE-0001 is Operator, a base role — never deletable, members or not. */
  it("409s a base role", async () => {
    const response = await deleteRole("ROLE-0001", "admin");
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("conflict");
  });

  /**
   * ROLE-0007 is Shutdown Coordinator, a §6.6 baseline role — `base` for the
   * same reason Unit Manager and HSSE Officer are, and so undeletable however
   * few members it has. This complements the ROLE-0001 case above: the guard
   * covers the §6.6 baseline roles, not just the five §6 names.
   */
  it("409s a §6.6 baseline role", async () => {
    const response = await deleteRole("ROLE-0007", "admin");
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("conflict");
  });

  /** ROLE-0008, Turnaround Lead, seeds with one member. */
  it("409s a custom role that still has members", async () => {
    const response = await deleteRole("ROLE-0008", "admin");
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.message).toContain("role in use");
  });

  it("deletes a custom role with no members and answers 200", async () => {
    const role = mockStore().roles.find(
      (candidate) => candidate.id === "ROLE-0008"
    );
    if (role) role.member_count = 0;

    const response = await deleteRole("ROLE-0008", "admin");

    expect(response.status).toBe(200);
    expect(
      mockStore().roles.some((candidate) => candidate.id === "ROLE-0008")
    ).toBe(false);
  });

  it("refuses a Super User with a 403", async () => {
    const response = await deleteRole("ROLE-0008", "superUser");
    expect(response.status).toBe(403);
  });

  it("writes an audit entry naming the deleted role", async () => {
    const role = mockStore().roles.find(
      (candidate) => candidate.id === "ROLE-0008"
    );
    if (role) role.member_count = 0;

    await deleteRole("ROLE-0008", "admin");

    expect(latestAudit()?.action).toBe("DELETE_ROLE");
    expect(latestAudit()?.target).toContain("Turnaround Lead");
  });
});

/* -------------------------------------------------------------------------- */
/* GET /audit — FR-ADM-05, §9.3, FR-OBS-01                                     */
/* -------------------------------------------------------------------------- */

describe("GET /audit", () => {
  it("returns a paginated envelope the client schema accepts", async () => {
    const response = await get(auditGET, "/audit", "admin");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(() => auditListResponseSchema.parse(body)).not.toThrow();
  });

  /**
   * §6.4 gives the Administrator "review audit and AI-usage logs"; §6.5's five
   * Super User bullets are silent on audit. This is the API half of FR-ADM-03
   * for that reading.
   */
  it("refuses a Super User and an Operator alike", async () => {
    expect((await get(auditGET, "/audit", "superUser")).status).toBe(403);
    expect((await get(auditGET, "/audit", "operator")).status).toBe(403);
  });

  it("returns the newest row first", async () => {
    const response = await get(auditGET, "/audit", "admin");
    const { items } = (await response.json()).data;
    const times = items.map((row: { occurred_at: string }) =>
      Date.parse(row.occurred_at)
    );

    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("filters by action", async () => {
    const response = await get(auditGET, "/audit?action=LOGIN", "admin");
    const { items } = (await response.json()).data;

    expect(items.length).toBeGreaterThan(0);
    expect(
      items.every((row: { action: string }) => row.action === "LOGIN")
    ).toBe(true);
  });

  it("treats the all sentinel as no filter", async () => {
    const all = await get(auditGET, "/audit?action=all&username=all", "admin");
    const bare = await get(auditGET, "/audit", "admin");

    expect((await all.json()).data.total).toBe((await bare.json()).data.total);
  });

  it("filters by the actor's username", async () => {
    const response = await get(
      auditGET,
      "/audit?username=said.albusaidi",
      "admin"
    );
    const { items } = (await response.json()).data;

    expect(items.length).toBeGreaterThan(0);
    expect(
      items.every(
        (row: { actor: { username: string } | null }) =>
          row.actor?.username === "said.albusaidi"
      )
    ).toBe(true);
  });

  /**
   * The date filter the prototype draws a chip for and neither the schema nor
   * the handler supported before Phase 3b. Bounds are **plant-local calendar
   * days**, inclusive at both ends.
   */
  describe("date range", () => {
    /** 22:30 GST on the 30th, which is still 18:30 UTC on the 30th. */
    const seedLateNightRow = () => {
      appendAuditEvent({
        id: "AUD-LATE",
        occurred_at: "2026-07-30T18:30:00+00:00",
        actor: { username: "said.albusaidi", display_name: "Said Al-Busaidi" },
        role_label: "Operator",
        action: "VIEW_ACTION",
        target: "ACT-LATE",
        result: "success",
      });
    };

    it("includes both ends of the range", async () => {
      seedLateNightRow();
      const response = await get(
        auditGET,
        "/audit?from=2026-07-30&to=2026-07-30",
        "admin"
      );

      expect((await response.json()).data.items).toHaveLength(1);
    });

    it("excludes a row outside the range", async () => {
      seedLateNightRow();
      const before = await get(auditGET, "/audit?to=2026-07-29", "admin");
      // Bounded on both ends, unlike the "before" query above — an unbounded
      // `from` would also catch whatever the base seed writes for "today",
      // which is no help in proving this one row falls outside the window.
      const after = await get(
        auditGET,
        "/audit?from=2026-07-31&to=2026-07-31",
        "admin"
      );

      expect((await before.json()).data.items).toHaveLength(0);
      expect((await after.json()).data.items).toHaveLength(0);
    });

    /**
     * The reason the handler converts before comparing. 21:00 UTC on the 30th
     * is 01:00 on the plant's clock on the **31st** — a night shift's entries
     * sit either side of midnight UTC, and reading the instant's UTC date would
     * file them under the wrong day for the people who worked them.
     */
    it("files a row by the plant's calendar day, not the UTC one", async () => {
      appendAuditEvent({
        id: "AUD-CROSSING",
        occurred_at: "2026-07-30T21:00:00+00:00",
        actor: null,
        role_label: "System",
        action: "RETENTION_PURGE",
        target: "ACT-CROSSING",
        result: "success",
      });

      const utcDay = await get(
        auditGET,
        "/audit?from=2026-07-30&to=2026-07-30",
        "admin"
      );
      const plantDay = await get(
        auditGET,
        "/audit?from=2026-07-31&to=2026-07-31",
        "admin"
      );

      expect((await utcDay.json()).data.items).toHaveLength(0);
      expect((await plantDay.json()).data.items).toHaveLength(1);
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Sign-in auditing — FR-ADM-05, §9.3                                          */
/* -------------------------------------------------------------------------- */

/**
 * **FR-ADM-05** — "Capture a full audit trail: **sign-ins**, approvals, AI
 * questions, exports, and settings changes" — and §9.3 both name sign-ins
 * first. Nothing emitted `LOGIN` before Phase 3b.
 */
describe("POST /dev/token — sign-in auditing", () => {
  it("records a successful sign-in with the roles it resolved", async () => {
    const before = mockStore().auditEvents.length;
    const response = await postToken({
      username: "noura.alkindi",
      groups: ["OLNG-ELOG-ADMINS"],
      display_name: "Noura Al-Kindi",
    });

    expect(response.status).toBe(200);
    expect(mockStore().auditEvents).toHaveLength(before + 1);
    expect(latestAudit()?.action).toBe("LOGIN");
    expect(latestAudit()?.result).toBe("success");
    expect(latestAudit()?.actor?.username).toBe("noura.alkindi");
    expect(latestAudit()?.role_label).toBe("Administrator");
    expect(latestAudit()?.target).toContain("AD FS");
  });

  it("resolves the union of roles for a multi-group account", async () => {
    await postToken({
      username: "maryam.alzadjali",
      groups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
    });

    expect(latestAudit()?.role_label).toBe("Operator · Management");
  });

  /**
   * The higher-value half. `result` has been on `recordAudit` since Phase 0a
   * and no call site ever passed `"failure"`, so the screen's Result column
   * would have read as decoration.
   */
  it("records a refused sign-in as a failure, naming the account", async () => {
    const response = await postToken({
      username: "hamed.alsiyabi",
      groups: ["OLNG-CONTRACTORS"],
    });

    expect(response.status).toBe(422);
    expect(latestAudit()?.action).toBe("LOGIN");
    expect(latestAudit()?.result).toBe("failure");
    // The attempted username is the point — "somebody was refused" answers none
    // of the questions this log exists to answer.
    expect(latestAudit()?.actor?.username).toBe("hamed.alsiyabi");
    expect(latestAudit()?.target).toContain("OLNG-CONTRACTORS");
    expect(latestAudit()?.role_label).toBe("—");
  });

  it("records nothing for a body that never named an account", async () => {
    const before = mockStore().auditEvents.length;
    await postToken({ groups: ["OLNG-ELOG-ADMINS"] });

    expect(mockStore().auditEvents).toHaveLength(before);
  });

  /** Reachable from the sign-in screen, so a demo can actually show it. */
  it("leaves the refusal in the log an Administrator reads", async () => {
    await postToken({
      username: "hamed.alsiyabi",
      groups: ["OLNG-CONTRACTORS"],
    });

    const response = await get(auditGET, "/audit?action=LOGIN", "admin");
    const { items } = (await response.json()).data;

    expect(
      items.some(
        (row: { result: string; actor: { username: string } | null }) =>
          row.result === "failure" && row.actor?.username === "hamed.alsiyabi"
      )
    ).toBe(true);
  });
});
