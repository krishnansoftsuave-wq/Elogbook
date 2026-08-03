import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as monitoringGET } from "@/app/api/v1/admin/monitoring/route";
import {
  GET as layoutGET,
  PUT as layoutPUT,
} from "@/app/api/v1/me/dashboard-layout/route";
import { GET as plantOpsGET } from "@/app/api/v1/plant-operations/route";
import { GET as platformGET } from "@/app/api/v1/platform-overview/route";
import { dashboardLayoutResponseSchema } from "@/features/dashboards/schemas";
import { systemMonitoringResponseSchema } from "@/features/monitoring/schemas";
import { plantOperationsResponseSchema } from "@/features/plant-ops/schemas";
import { platformOverviewResponseSchema } from "@/features/platform/schemas";
import { mintMockToken } from "@/mocks/auth/token";
import { resetMockStore } from "@/mocks/store";

/**
 * The four endpoints the dashboard module added — **FR-OBS-02/04** (telemetry),
 * **FR-DASH-04/05** (a personal layout, isolated per user) and the two
 * unratified plant-ops / platform seeds.
 *
 * ⚠️ **These handlers shipped with no tests at all**, which mattered most for
 * the one that carries a permission gate: changing `/admin/monitoring` from
 * `mockRoute({ permission: WILDCARD_PERMISSION })` to `mockRoute({})` left the
 * entire suite green while opening an Administrator-only screen to every
 * session. `denies an operator` below is the assertion that now fails.
 *
 * Handlers are invoked directly, as in `routes.admin.test.ts` — that covers
 * status codes, envelopes and branches, but does not prove Next maps the URLs
 * to these files. Only a request over the wire does, which is `e2e/`'s job.
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

const putLayout = (
  items: readonly unknown[],
  persona?: Persona
): Promise<Response> =>
  layoutPUT(
    new NextRequest(`${BASE}/me/dashboard-layout`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(persona ? { Authorization: bearer(persona) } : {}),
      },
      body: JSON.stringify({ items }),
    })
  );

/** The layout endpoint mutates a process-wide store. */
beforeEach(() => {
  resetMockStore();
});

describe("GET /admin/monitoring (FR-OBS-02, FR-OBS-04)", () => {
  it("rejects an unauthenticated request", async () => {
    const response = await get(monitoringGET, "/admin/monitoring");
    expect(response.status).toBe(401);
  });

  /**
   * The gate this endpoint exists behind. It is the only assertion in the suite
   * that distinguishes `mockRoute({ permission: WILDCARD_PERMISSION })` from
   * `mockRoute({})`.
   */
  it("denies an operator", async () => {
    const response = await get(monitoringGET, "/admin/monitoring", "operator");
    expect(response.status).toBe(403);
  });

  it("denies a super user, who holds dashboard:configure but not the wildcard", async () => {
    const response = await get(monitoringGET, "/admin/monitoring", "superUser");
    expect(response.status).toBe(403);
  });

  it("serves an administrator a payload matching the contract", async () => {
    const response = await get(monitoringGET, "/admin/monitoring", "admin");
    expect(response.status).toBe(200);

    // `parse`, not a field spot-check: the schema is what the client applies.
    const parsed = systemMonitoringResponseSchema.parse(await response.json());
    expect(parsed.data.services.length).toBeGreaterThan(0);
  });
});

describe("GET /plant-operations and /platform-overview", () => {
  it.each([
    ["plant-operations", plantOpsGET, "/plant-operations"],
    ["platform-overview", platformGET, "/platform-overview"],
  ] as const)(
    "rejects an unauthenticated request to %s",
    async (_, handler, path) => {
      expect((await get(handler, path)).status).toBe(401);
    }
  );

  /**
   * Deliberately open to any authenticated session, unlike `/admin/monitoring`.
   * Both serve figures the BRD does not cover and neither is role-scoped, so the
   * assertion records the decision rather than assuming it.
   */
  it("serves plant operations to an operator", async () => {
    const response = await get(plantOpsGET, "/plant-operations", "operator");
    expect(response.status).toBe(200);

    const parsed = plantOperationsResponseSchema.parse(await response.json());
    expect(parsed.data.due_categories.length).toBeGreaterThan(0);
  });

  it("serves the platform overview to an operator", async () => {
    const response = await get(platformGET, "/platform-overview", "operator");
    expect(response.status).toBe(200);

    const parsed = platformOverviewResponseSchema.parse(await response.json());
    expect(parsed.data.users_by_role.length).toBeGreaterThan(0);
  });
});

describe("/me/dashboard-layout (FR-DASH-04, FR-DASH-05)", () => {
  const ENTRY = { widget_id: "WID-001", hidden: false, wide: true };

  it("rejects an unauthenticated read and write", async () => {
    expect((await get(layoutGET, "/me/dashboard-layout")).status).toBe(401);
    expect((await putLayout([ENTRY])).status).toBe(401);
  });

  it("starts empty and returns what was saved", async () => {
    const before = await get(layoutGET, "/me/dashboard-layout", "operator");
    expect(
      dashboardLayoutResponseSchema.parse(await before.json()).data.items
    ).toEqual([]);

    const saved = await putLayout([ENTRY], "operator");
    expect(saved.status).toBe(200);

    const after = await get(layoutGET, "/me/dashboard-layout", "operator");
    expect(
      dashboardLayoutResponseSchema.parse(await after.json()).data.items
    ).toEqual([ENTRY]);
  });

  /**
   * **FR-DASH-05, in the direction that matters.** The endpoint takes no
   * username — the subject is the bearer token — so this is structural rather
   * than a check somebody could forget. The test pins the structure.
   */
  it("keeps one user's layout out of another's", async () => {
    await putLayout([ENTRY], "operator");

    const other = await get(layoutGET, "/me/dashboard-layout", "admin");
    expect(
      dashboardLayoutResponseSchema.parse(await other.json()).data.items
    ).toEqual([]);
  });

  it("treats an empty array as a reset rather than a no-op", async () => {
    await putLayout([ENTRY], "operator");
    await putLayout([], "operator");

    const after = await get(layoutGET, "/me/dashboard-layout", "operator");
    expect(
      dashboardLayoutResponseSchema.parse(await after.json()).data.items
    ).toEqual([]);
  });

  it("rejects a malformed body", async () => {
    const response = await putLayout([{ widget_id: 7 }], "operator");
    expect(response.status).toBe(422);
  });

  /**
   * The username reaches a bracket read on a plain object, and the token is
   * forgeable by design in this mock — so an inherited `Object.prototype` member
   * used to satisfy the `??` guard and be returned. `constructor` produced a
   * function, which `JSON.stringify` drops, so the client received a `data`
   * object with no `items` and its Zod parse threw.
   */
  it("does not answer for an inherited property name", async () => {
    const token = mintMockToken({
      username: "constructor",
      displayName: "constructor",
      groups: ["OLNG-ELOG-OPERATORS"],
    }).access_token;

    const response = await layoutGET(
      new NextRequest(`${BASE}/me/dashboard-layout`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    expect(response.status).toBe(200);
    expect(
      dashboardLayoutResponseSchema.parse(await response.json()).data.items
    ).toEqual([]);
  });

  /** `__proto__` must store an own key, not reassign the map's prototype. */
  it("does not let a __proto__ username poison the store", async () => {
    const token = mintMockToken({
      username: "__proto__",
      displayName: "__proto__",
      groups: ["OLNG-ELOG-OPERATORS"],
    }).access_token;

    const written = await layoutPUT(
      new NextRequest(`${BASE}/me/dashboard-layout`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: [ENTRY] }),
      })
    );
    expect(written.status).toBe(200);

    // An unrelated user must still start empty.
    const other = await get(layoutGET, "/me/dashboard-layout", "admin");
    expect(
      dashboardLayoutResponseSchema.parse(await other.json()).data.items
    ).toEqual([]);
  });
});
