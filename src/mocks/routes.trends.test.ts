import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as trendsGET } from "@/app/api/v1/trends/route";
import { trendsSummaryResponseSchema } from "@/features/trends/schemas";
import { mintMockToken } from "@/mocks/auth/token";

/**
 * §7.7 — **FR-AN-02**'s trend dashboard. Handlers are invoked directly, as
 * `routes.operations.test.ts` and `routes.admin.test.ts` do it: this covers
 * status codes, envelopes and every branch, but does not prove Next maps the
 * URL to this file — only a request over the wire does that.
 *
 * No `resetMockStore()` here: `/trends` has no `MockStoreData` entry (see the
 * route's comment) — there is nothing a prior test could leave dirty.
 */
const BASE = "http://localhost:3000/api/v1";

const GROUPS = {
  operator: ["OLNG-ELOG-OPERATORS"],
  supervisor: ["OLNG-ELOG-SUPERVISORS"],
  management: ["OLNG-ELOG-SUPERINTENDENTS"],
  admin: ["OLNG-ELOG-ADMINS"],
  superUser: ["OLNG-ELOG-SUPERUSERS"],
} as const;

const ACCOUNTS = {
  operator: "said.albusaidi",
  supervisor: "fatma.alharthy",
  management: "khalid.almamari",
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

const get = (path: string, persona?: Persona) =>
  trendsGET(
    new NextRequest(`${BASE}${path}`, {
      headers: persona ? { Authorization: bearer(persona) } : {},
    })
  );

/** The prototype's exact 7-day ADP series, app-source.txt 1910. */
const ADP_WEEK = [42, 43, 45, 44, 46, 43, 44];

describe("GET /trends — §7.7, FR-AN-02", () => {
  it("admits supervisor, management and administrator", async () => {
    for (const persona of ["supervisor", "management", "admin"] as const) {
      const response = await get("/trends", persona);
      expect(response.status).toBe(200);
    }
  });

  /**
   * `report:read` is the API-side half of `ROUTE_PERMISSIONS.TRENDS` —
   * operator and super_user hold neither `report:read` nor `analytics:read`,
   * matching the prototype's nav (`SUPNAV` carries Trends & KPIs; `operator`
   * and `superuser` do not).
   */
  it("403s operator and super user", async () => {
    for (const persona of ["operator", "superUser"] as const) {
      const response = await get("/trends", persona);
      expect(response.status).toBe(403);
    }
  });

  it("401s an unauthenticated request", async () => {
    const response = await get("/trends");
    expect(response.status).toBe(401);
  });

  it("returns a response that parses against the contract", async () => {
    const response = await get("/trends", "supervisor");
    const body = await response.json();

    expect(() => trendsSummaryResponseSchema.parse(body)).not.toThrow();
  });

  it("defaults to a 7-day window", async () => {
    const response = await get("/trends", "supervisor");
    const body = await response.json();

    expect(body.data.period).toBe("7d");
    const adp = body.data.production_kpis.find(
      (kpi: { code: string }) => kpi.code === "ADP"
    );
    expect(adp.values).toEqual(ADP_WEEK);
  });

  /**
   * The prototype's transcribed week is always the *tail* of the series,
   * whatever window is requested — the 23 generated days sit before it, never
   * after.
   */
  it.each([
    ["14d", 14],
    ["30d", 30],
  ])(
    "slices a %s window to %d points, ending on the real week",
    async (period, length) => {
      const response = await get(`/trends?period=${period}`, "supervisor");
      const body = await response.json();

      expect(body.data.period).toBe(period);
      const adp = body.data.production_kpis.find(
        (kpi: { code: string }) => kpi.code === "ADP"
      );
      expect(adp.values).toHaveLength(length);
      expect(adp.values.slice(-7)).toEqual(ADP_WEEK);
    }
  );

  it("rejects a period outside 7d/14d/30d with a 422", async () => {
    const response = await get("/trends?period=90d", "supervisor");
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details).toHaveProperty("period");
  });

  /**
   * The 23 generated leading days come from a seeded PRNG (`mulberry32`), not
   * `Math.random` — two independent requests must produce byte-identical
   * series, which is the property that makes the fixture and a test pinned
   * against it stay in agreement.
   */
  it("generates the same series on every request", async () => {
    const first = await (await get("/trends?period=30d", "supervisor")).json();
    const second = await (await get("/trends?period=30d", "supervisor")).json();

    expect(first.data.production_kpis).toEqual(second.data.production_kpis);
  });

  it("carries the seven compliance categories with named buckets", async () => {
    const response = await get("/trends", "management");
    const body = await response.json();

    expect(body.data.compliance_categories).toHaveLength(7);
    const liveTempMoc = body.data.compliance_categories.find(
      (category: { code: string }) => category.code === "live_temp_moc"
    );
    expect(
      liveTempMoc.buckets.find(
        (bucket: { bucket: string }) => bucket.bucket === "due_within_30_days"
      ).count
    ).toBe(9);
  });

  /**
   * A scheduled return carries a date; the other two kinds are the reason
   * there is no date — see `EquipmentOutOfService` in the schema.
   */
  it("carries a return date only for a scheduled equipment return", async () => {
    const response = await get("/trends", "management");
    const rows = (await response.json()).data.equipment_out_of_service;

    expect(rows).toHaveLength(7);
    for (const row of rows) {
      if (row.expected_return_kind === "scheduled") {
        expect(row.expected_return_at).not.toBeNull();
      } else {
        expect(row.expected_return_at).toBeNull();
      }
    }
  });

  it("carries both flare areas on fuel gas and OLET at zero", async () => {
    const response = await get("/trends", "management");
    const body = await response.json();

    expect(body.data.flare_purge_areas).toHaveLength(2);
    expect(
      body.data.flare_purge_areas.every(
        (area: { medium: string }) => area.medium === "fuel_gas"
      )
    ).toBe(true);
    expect(body.data.olet.count).toBe(0);
  });

  it("carries the three ships, nearest arrival first", async () => {
    const response = await get("/trends", "management");
    const ships = (await response.json()).data.next_ships;

    expect(ships).toHaveLength(3);
    expect(ships[0].vessel).toBe("Myrina LNG");
    expect(ships.map((ship: { status: string }) => ship.status)).toEqual([
      "scheduled",
      "scheduled",
      "provisional",
    ]);
  });
});
