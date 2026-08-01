import type {
  AreaCountWire,
  ComplianceCategoryWire,
  DueBucket,
  EquipmentOutOfServiceWire,
  FlarePurgeAreaWire,
  KpiSeriesTone,
  OletSummaryWire,
  ProductionKpiWire,
  ReturnDateKind,
  ShipArrivalWire,
  TrendPeriod,
} from "@/features/trends/schemas";
import { daysFromBase } from "@/mocks/data/clock";

/**
 * Trends & KPIs fixtures — `trends()`, app-source.txt 1901–1982.
 *
 * **Read-only, so this module carries no `MockStoreData` entry.** Nothing on
 * `/trends` is ever written; `store.ts`'s reason for existing at all —
 * "without somewhere to put a write, a mutation could only be faked" — does
 * not apply here. Every `seedX` below is a pure function, called fresh by the
 * route on each request.
 *
 * PROVISIONAL field names, on the terms `features/trends/schemas.ts` states.
 */

/* -------------------------------------------------------------------------- */
/* Production KPIs                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A tiny seeded PRNG (the public-domain `mulberry32` algorithm) —
 * deterministic given a seed, unlike `Math.random`, so the same 30-day series
 * comes out on every run and a test can pin exact values.
 */
const mulberry32 = (seed: number) => {
  let state = seed;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

interface KpiSeed {
  code: string;
  label: string;
  unit: string;
  tone: KpiSeriesTone;
  /** Oldest → newest, transcribed verbatim from app-source.txt 1910–1914. */
  recentWeek: readonly number[];
  /** Fixed per metric so its backward walk is reproducible on its own. */
  walkSeed: number;
  /** Largest day-over-day change the backward walk may take. */
  maxStep: number;
  precision: number;
  /** A value can never generate below this — keeps a random walk off negative Bar/MM readings. */
  floor: number;
}

const DAYS_BEFORE_WEEK = 23;

/**
 * Walks backward from `recentWeek[0]` for 23 days to build a 30-day series,
 * then appends the real week unchanged. **Only these 23 leading days are
 * generated** — the trailing 7 are the prototype's transcribed values, always.
 */
const extendToThirtyDays = (seed: KpiSeed): number[] => {
  const rng = mulberry32(seed.walkSeed);
  const backward: number[] = [];
  let cursor = seed.recentWeek[0] ?? 0;

  for (let day = 0; day < DAYS_BEFORE_WEEK; day += 1) {
    const delta = (rng() - 0.5) * 2 * seed.maxStep;
    cursor = Math.max(seed.floor, round(cursor - delta, seed.precision));
    backward.push(cursor);
  }

  return [...backward.reverse(), ...seed.recentWeek];
};

/**
 * `prod`, app-source.txt 1910–1914 — the five KPIs, extended from 7 to 30
 * days. The prototype never shows more than a week; the 23 days before it are
 * generated so `?period=14d` / `?period=30d` have real series to slice
 * (see the route for why the period selector is worth making real at all).
 */
const KPI_SEEDS: readonly KpiSeed[] = [
  {
    code: "ADP",
    label: "Agreed Daily Prod.",
    unit: "MM",
    tone: "series-1",
    recentWeek: [42, 43, 45, 44, 46, 43, 44],
    walkSeed: 1001,
    maxStep: 2,
    precision: 0,
    floor: 30,
  },
  {
    code: "Spot",
    label: "Spot Rate",
    unit: "MM",
    tone: "series-2",
    recentWeek: [37, 38, 40, 39, 41, 38, 39],
    walkSeed: 1002,
    maxStep: 2,
    precision: 0,
    floor: 25,
  },
  {
    code: "AVG",
    label: "Average Rate",
    unit: "MM",
    tone: "series-3",
    recentWeek: [50, 50.5, 51, 51.2, 51.5, 51, 51.2],
    walkSeed: 1003,
    maxStep: 1,
    precision: 1,
    floor: 45,
  },
  {
    code: "TLP",
    label: "Line Pressure",
    unit: "Bar",
    tone: "series-4",
    recentWeek: [71.6, 72, 73.3, 72.8, 74, 71.8, 72],
    walkSeed: 1004,
    maxStep: 1.5,
    precision: 1,
    floor: 60,
  },
  {
    code: "Flare",
    label: "Flaring Rate",
    unit: "t/d",
    tone: "series-5",
    recentWeek: [0, 0, 1.2, 0, 0, 0.6, 0],
    walkSeed: 1005,
    maxStep: 1,
    precision: 1,
    floor: 0,
  },
];

/** Every value oldest → newest, 30 entries per series — see `sparkCard`. */
export const seedProductionKpis = (): ProductionKpiWire[] =>
  KPI_SEEDS.map((seed) => ({
    code: seed.code,
    label: seed.label,
    unit: seed.unit,
    tone: seed.tone,
    values: extendToThirtyDays(seed),
  }));

/** How many trailing days of a 30-day series each period pill shows. */
export const PERIOD_WINDOW_DAYS: Record<TrendPeriod, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

/* -------------------------------------------------------------------------- */
/* Compliance items — due-date status by category                             */
/* -------------------------------------------------------------------------- */

const DUE_BUCKET_ORDER: readonly DueBucket[] = [
  "overdue",
  "due_within_7_days",
  "due_within_30_days",
  "due_beyond_30_days",
  "no_due_date",
];

/**
 * `dueCats()`, app-source.txt 547–555. Each `counts` tuple is positional in
 * the prototype's own `RAG()` order — `[overdue, ≤7d, ≤30d, >30d, no date]` —
 * matched here index-for-index against `DUE_BUCKET_ORDER` and given a name
 * instead of a position.
 */
const DUE_CATEGORY_SEEDS: readonly {
  code: string;
  label: string;
  counts: readonly [number, number, number, number, number];
}[] = [
  { code: "active_force", label: "Active Force", counts: [2, 3, 4, 1, 0] },
  { code: "active_aof", label: "Active AOF", counts: [1, 2, 2, 1, 0] },
  { code: "icc_in_dft", label: "ICC in DFT", counts: [0, 1, 1, 0, 0] },
  { code: "icc_in_epi", label: "ICC in EPI", counts: [3, 4, 7, 3, 1] },
  { code: "live_temp_moc", label: "Live Temp MOC", counts: [1, 2, 9, 8, 1] },
  { code: "smith_lock", label: "SMITH Lock", counts: [0, 1, 3, 2, 0] },
  { code: "cso_csc", label: "CSO/CSC", counts: [1, 2, 2, 1, 1] },
];

export const seedComplianceCategories = (): ComplianceCategoryWire[] =>
  DUE_CATEGORY_SEEDS.map((category) => ({
    code: category.code,
    label: category.label,
    buckets: DUE_BUCKET_ORDER.map((bucket, index) => ({
      bucket,
      count: category.counts[index] ?? 0,
    })),
  }));

/* -------------------------------------------------------------------------- */
/* Equipment out of service                                                   */
/* -------------------------------------------------------------------------- */

interface OosSeed {
  tag: string;
  area: string;
  /** Days from the prototype's own "24 Jun 2026" reference (`pageHead`, app-source.txt 1971). */
  outSinceOffsetDays: number;
  returnKind: ReturnDateKind;
  returnOffsetDays: number | null;
}

/**
 * `oosRows`, app-source.txt 1931–1939. Dates are offsets from seed time
 * rather than the prototype's literal "2026" dates, for `clock.ts`'s reason: a
 * fixture frozen on a specific calendar date reads as ancient within a week
 * and everything looks overdue. The offsets are each row's day-difference from
 * the prototype's own reference date, so the *relative* shape survives the
 * port — which tag went out first, how far out a return sits — even though the
 * absolute date does not.
 */
const OOS_SEEDS: readonly OosSeed[] = [
  {
    tag: "2P-1401A",
    area: "Train 2",
    outSinceOffsetDays: -21,
    returnKind: "scheduled",
    returnOffsetDays: 24,
  },
  {
    tag: "2E-1104C",
    area: "Train 2",
    outSinceOffsetDays: -19,
    returnKind: "to_be_confirmed",
    returnOffsetDays: null,
  },
  {
    tag: "2E-1313A",
    area: "Train 2",
    outSinceOffsetDays: -18,
    returnKind: "next_shutdown",
    returnOffsetDays: null,
  },
  {
    tag: "3PM-1425",
    area: "Train 3",
    outSinceOffsetDays: -17,
    returnKind: "scheduled",
    returnOffsetDays: 26,
  },
  {
    tag: "K4061A",
    area: "Common Fac.",
    outSinceOffsetDays: -20,
    returnKind: "scheduled",
    returnOffsetDays: 21,
  },
  {
    tag: "KD4086",
    area: "Common Fac.",
    outSinceOffsetDays: -22,
    returnKind: "to_be_confirmed",
    returnOffsetDays: null,
  },
  {
    tag: "Elevator (Tank 1)",
    area: "Storage",
    outSinceOffsetDays: -23,
    returnKind: "scheduled",
    returnOffsetDays: 18,
  },
];

export const seedEquipmentOutOfService = (
  base: Date
): EquipmentOutOfServiceWire[] =>
  OOS_SEEDS.map((seed) => ({
    tag: seed.tag,
    area: seed.area,
    out_since: daysFromBase(seed.outSinceOffsetDays, base),
    expected_return_kind: seed.returnKind,
    expected_return_at:
      seed.returnOffsetDays === null
        ? null
        : daysFromBase(seed.returnOffsetDays, base),
  }));

/** `oosByArea`, app-source.txt 1930 — the "By area" bar beside the table. */
export const seedEquipmentOutOfServiceByArea = (): AreaCountWire[] => [
  { area: "Train 2", count: 3 },
  { area: "Train 3", count: 1 },
  { area: "Common Fac.", count: 2 },
  { area: "Storage", count: 1 },
];

/* -------------------------------------------------------------------------- */
/* Flare purge medium                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The two flare areas, app-source.txt 1949–1954 — both switched to Fuel Gas
 * on the same day as the earliest out-of-service tag (03 Jun 2026 in the
 * prototype), so the same `-21` offset is reused.
 */
export const seedFlarePurgeAreas = (base: Date): FlarePurgeAreaWire[] => [
  {
    area: "Flare Area 1",
    medium: "fuel_gas",
    since: daysFromBase(-21, base),
  },
  {
    area: "Flare Area 2",
    medium: "fuel_gas",
    since: daysFromBase(-21, base),
  },
];

/* -------------------------------------------------------------------------- */
/* OLET                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * app-source.txt 1956–1958: "all-zero across the supplied extract (135
 * occurrences, every one a zero count)". Zero is the transcription, not a
 * placeholder.
 */
export const seedOlet = (): OletSummaryWire => ({ count: 0 });

/* -------------------------------------------------------------------------- */
/* Next ships                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `ships`, app-source.txt 1960. The prototype pairs a date with a separate
 * clock-time string ("26 Jun · 02:00"); this collapses them into one instant.
 * The exact hour is not load-bearing for a mock fixture, so only each ship's
 * day offset from the "24 Jun 2026" reference is preserved.
 */
export const seedNextShips = (base: Date): ShipArrivalWire[] => [
  { vessel: "Myrina LNG", eta: daysFromBase(2, base), status: "scheduled" },
  { vessel: "Nizwa LNG", eta: daysFromBase(5, base), status: "scheduled" },
  {
    vessel: "Flex Ranger",
    eta: daysFromBase(8, base),
    status: "provisional",
  },
];
