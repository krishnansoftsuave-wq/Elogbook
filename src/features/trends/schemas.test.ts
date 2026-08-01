import { describe, expect, it } from "vitest";

import {
  DUE_BUCKETS,
  DUE_BUCKET_TONE,
  TREND_PERIODS,
  toTrendsSummary,
  trendFiltersSchema,
  trendsSummaryResponseSchema,
  trendsSummaryWireSchema,
} from "@/features/trends/schemas";

/**
 * Derived from `app-source.txt` 1901–1982 — the same numbers the prototype
 * renders, so a field that drifts shows up as a parse failure rather than as a
 * blank card. Every name here is PROVISIONAL; see the schema's header.
 */
const WIRE = {
  period: "7d",
  production_kpis: [
    {
      code: "ADP",
      label: "Agreed Daily Prod.",
      unit: "MM",
      values: [42, 43, 45, 44, 46, 43, 44],
      tone: "series-1",
    },
    {
      code: "Flare",
      label: "Flaring Rate",
      unit: "t/d",
      values: [0, 0, 1.2, 0, 0, 0.6, 0],
      tone: "series-5",
    },
  ],
  compliance_categories: [
    {
      code: "active_force",
      label: "Active Force",
      buckets: [
        { bucket: "overdue", count: 2 },
        { bucket: "due_within_7_days", count: 3 },
        { bucket: "due_within_30_days", count: 4 },
        { bucket: "due_beyond_30_days", count: 1 },
        { bucket: "no_due_date", count: 0 },
      ],
    },
  ],
  equipment_out_of_service: [
    {
      tag: "2P-1401A",
      area: "Train 2",
      out_since: "2026-06-03",
      expected_return_kind: "scheduled",
      expected_return_at: "2026-07-18",
    },
    {
      tag: "2E-1104C",
      area: "Train 2",
      out_since: "2026-06-05",
      expected_return_kind: "to_be_confirmed",
      expected_return_at: null,
    },
    {
      tag: "2E-1313A",
      area: "Train 2",
      out_since: "2026-06-06",
      expected_return_kind: "next_shutdown",
      expected_return_at: null,
    },
  ],
  equipment_out_of_service_by_area: [
    { area: "Train 2", count: 3 },
    { area: "Train 3", count: 1 },
  ],
  flare_purge_areas: [
    { area: "Flare Area 1", medium: "fuel_gas", since: "2026-06-03" },
    { area: "Flare Area 2", medium: "fuel_gas", since: "2026-06-03" },
  ],
  olet: { count: 0 },
  next_ships: [
    {
      vessel: "Myrina LNG",
      eta: "2026-06-26T02:00:00+04:00",
      status: "scheduled",
    },
    {
      vessel: "Flex Ranger",
      eta: "2026-07-02T14:00:00+04:00",
      status: "provisional",
    },
  ],
} as const;

describe("trends summary schema", () => {
  it("parses the prototype's shape", () => {
    expect(() => trendsSummaryWireSchema.parse(WIRE)).not.toThrow();
  });

  it("maps every section from snake_case to camelCase", () => {
    const summary = toTrendsSummary(trendsSummaryWireSchema.parse(WIRE));

    expect(summary.productionKpis[0]?.code).toBe("ADP");
    expect(summary.complianceCategories[0]?.label).toBe("Active Force");
    expect(summary.equipmentOutOfService[0]?.outSince).toBe("2026-06-03");
    expect(summary.equipmentOutOfService[0]?.expectedReturnAt).toBe(
      "2026-07-18"
    );
    expect(summary.equipmentOutOfServiceByArea[0]?.count).toBe(3);
    expect(summary.flarePurgeAreas).toHaveLength(2);
    expect(summary.olet.count).toBe(0);
    expect(summary.nextShips[1]?.status).toBe("provisional");
  });

  /**
   * The three tiles above the out-of-service table are computed from the rows,
   * which is why the wire does not carry them. Pinned so a later "the totals
   * should come from the API" change has to argue with a test.
   */
  it("derives the out-of-service tiles from the rows", () => {
    const { equipmentOutOfService: rows } = toTrendsSummary(
      trendsSummaryWireSchema.parse(WIRE)
    );

    expect(rows).toHaveLength(3);
    expect(
      rows.filter((row) => row.expectedReturnKind === "to_be_confirmed")
    ).toHaveLength(1);
    expect(
      rows.filter((row) => row.expectedReturnKind === "next_shutdown")
    ).toHaveLength(1);
  });

  /**
   * A date belongs to `scheduled` and to nothing else — `to_be_confirmed` and
   * `next_shutdown` are the two reasons a row has no date. The prototype
   * expressed this by sniffing the first character of display text
   * (`r[3][0]>='0'&&r[3][0]<='9'`), which NFR-07's Arabic requirement breaks.
   */
  it("carries a return date only for a scheduled return", () => {
    const { equipmentOutOfService: rows } = toTrendsSummary(
      trendsSummaryWireSchema.parse(WIRE)
    );

    for (const row of rows) {
      if (row.expectedReturnKind === "scheduled") {
        expect(row.expectedReturnAt).not.toBeNull();
      } else {
        expect(row.expectedReturnAt).toBeNull();
      }
    }
  });

  it("rejects a bucket name this build does not know", () => {
    const broken = {
      ...WIRE,
      compliance_categories: [
        {
          code: "active_force",
          label: "Active Force",
          buckets: [{ bucket: "due_soon", count: 1 }],
        },
      ],
    };

    expect(() => trendsSummaryWireSchema.parse(broken)).toThrow();
  });

  /**
   * FR-AN-06 leaves the counting definitions "to be confirmed", so the category
   * *code* stays an open string — a confirmed eighth category must not fail to
   * parse the page it appears on.
   */
  it("accepts a compliance category this build has never heard of", () => {
    const extended = {
      ...WIRE,
      compliance_categories: [
        ...WIRE.compliance_categories,
        {
          code: "some_future_category",
          label: "Confirmed Later",
          buckets: [{ bucket: "overdue", count: 1 }],
        },
      ],
    };

    expect(() => trendsSummaryWireSchema.parse(extended)).not.toThrow();
  });

  it("requires the §3 envelope", () => {
    const parsed = trendsSummaryResponseSchema.parse({
      success: true,
      data: WIRE,
      meta: { correlation_id: "abc-123", timestamp: "2026-06-24T06:00:00Z" },
    });

    expect(parsed.data.period).toBe("7d");
    expect(() => trendsSummaryResponseSchema.parse(WIRE)).toThrow();
  });
});

describe("due-date buckets", () => {
  /** `RAG()` (app-source.txt 546) — five buckets, in legend order. */
  it("is RAG's five buckets in display order", () => {
    expect(DUE_BUCKETS).toEqual([
      "overdue",
      "due_within_7_days",
      "due_within_30_days",
      "due_beyond_30_days",
      "no_due_date",
    ]);
  });

  /** FR-AN-03 — green/amber/red status per measure. */
  it("gives every bucket a tone", () => {
    for (const bucket of DUE_BUCKETS) {
      expect(DUE_BUCKET_TONE[bucket]).toBeTruthy();
    }
    expect(DUE_BUCKET_TONE.overdue).toBe("critical");
    expect(DUE_BUCKET_TONE.due_beyond_30_days).toBe("positive");
  });
});

describe("trend filters", () => {
  it("accepts the prototype's three periods and nothing else", () => {
    for (const period of TREND_PERIODS) {
      expect(() =>
        trendFiltersSchema.parse({
          period,
          area: "",
          equipment: "",
          shift: "",
        })
      ).not.toThrow();
    }

    expect(() =>
      trendFiltersSchema.parse({
        period: "90d",
        area: "",
        equipment: "",
        shift: "",
      })
    ).toThrow();
  });

  /**
   * **FR-AN-02** asks for drill-down by area, equipment and shift; the
   * prototype offers none. The filter set follows the requirement, and empty
   * string means unfiltered — `summaryFiltersSchema`'s convention, so a form
   * reset produces a valid object rather than an absent key.
   */
  it("carries FR-AN-02's drill-down dimensions", () => {
    const filters = trendFiltersSchema.parse({
      period: "30d",
      area: "Train 2",
      equipment: "2P-1401A",
      shift: "20260624-D",
    });

    expect(filters).toEqual({
      period: "30d",
      area: "Train 2",
      equipment: "2P-1401A",
      shift: "20260624-D",
    });
  });
});
