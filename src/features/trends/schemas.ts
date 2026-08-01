import { z } from "zod";

import { envelopeSchema } from "@/lib/zod";

/**
 * Trends & KPIs — BRD §7.7 (FR-AN-01…06) and the trend half of §7.8's
 * FR-REP-01.
 *
 * ⚠️ **PROVISIONAL field names.** Every name in this file is derived from the
 * prototype's mock state (`app-source.txt` 1876–1982 — `trends`, `sparkCard`,
 * `trendTile`, `iHStack`, plus `RAG`/`dueCats` at 546–555), **not from a
 * backend contract**. No `/trends` response has been specified anywhere. The
 * `{ success, data, meta }` envelope is *not* provisional — that is
 * `authentication_flow.md` §3.
 *
 * **FR-AN-06** — "Apply agreed counting definitions for each measure
 * (*definitions to be confirmed*)" — is the requirement that makes the caveat
 * structural rather than cosmetic: the client has not yet confirmed what any of
 * these measures counts, so the shapes below record what the prototype
 * displays and nothing more.
 *
 * ## No colour crosses the wire
 *
 * The prototype carries a hex per series and per bucket (`'#0E8C81'`,
 * `'#C0392B'`, …). None of it survives here, for the reason
 * `features/summaries/schemas.ts` gives about severity: a hex on the wire
 * cannot respond to dark mode, and it would be the one place `globals.css`
 * leaks. The wire carries a *tone*; the render maps tone → theme token.
 */

/* -------------------------------------------------------------------------- */
/* Production KPIs — the sparkline strip                                       */
/* -------------------------------------------------------------------------- */

/**
 * A **categorical** palette slot, deliberately numbered rather than named.
 *
 * The five production KPIs are coloured to tell the series apart, not to say
 * anything about their state — teal for ADP carries no more meaning than blue
 * for Spot. Naming these `critical`/`positive`, as `DUE_BUCKETS` legitimately
 * are, would invent a semantics the prototype does not have and that no
 * requirement supports. Five slots because the prototype defines five series;
 * a sixth measure needs a sixth token, which should be a deliberate change.
 */
export const KPI_SERIES_TONES = [
  "series-1",
  "series-2",
  "series-3",
  "series-4",
  "series-5",
] as const;

export const kpiSeriesToneSchema = z.enum(KPI_SERIES_TONES);
export type KpiSeriesTone = z.infer<typeof kpiSeriesToneSchema>;

/**
 * One metric's short trend. `code`/`label`/`unit` are the prototype's
 * `['ADP','Agreed Daily Prod.','MM',…]` triple given names.
 *
 * `unit` is an open string, not an enum: the strip already mixes `MM`, `Bar`
 * and `t/d`, the screen's own footnote says "Units differ … so each metric is
 * scaled independently", and FR-AN-06 leaves the measure set unconfirmed.
 *
 * `values` is ordered **oldest → newest**; `sparkCard` reads `vals[len-1]` as
 * the current value and `vals[len-2]` as the one it compares against. Latest,
 * delta, avg, min and max are all derived at render — they are not carried,
 * because a wire that shipped both the series and its own summary could
 * contradict itself.
 */
export const productionKpiWireSchema = z.object({
  code: z.string(),
  label: z.string(),
  unit: z.string(),
  values: z.array(z.number()),
  tone: kpiSeriesToneSchema,
});

export const productionKpiSchema = z.object({
  code: z.string(),
  label: z.string(),
  unit: z.string(),
  values: z.array(z.number()),
  tone: kpiSeriesToneSchema,
});

export type ProductionKpiWire = z.infer<typeof productionKpiWireSchema>;
export type ProductionKpi = z.infer<typeof productionKpiSchema>;

export const toProductionKpi = (wire: ProductionKpiWire): ProductionKpi => ({
  code: wire.code,
  label: wire.label,
  unit: wire.unit,
  values: wire.values,
  tone: wire.tone,
});

/* -------------------------------------------------------------------------- */
/* Compliance items — due-date status by category                              */
/* -------------------------------------------------------------------------- */

/**
 * The five due-date buckets, from `RAG()` (app-source.txt 546). Unlike the KPI
 * series slots these **are** semantic — they are exactly **FR-AN-03**'s
 * "targets/thresholds per measure with green/amber/red status", which is why
 * they get meaning-bearing names and a tone that follows from the bucket
 * rather than from a palette position.
 *
 * Order is load-bearing: the prototype indexes this list positionally
 * (`c.b[0]` is overdue, `c.b[1]` is due ≤ 7 days, `c.b[4]` is no date). That
 * positional coupling is precisely what this enum exists to remove — the wire
 * names each count — but the display order stays the one the legend uses.
 */
export const DUE_BUCKETS = [
  "overdue",
  "due_within_7_days",
  "due_within_30_days",
  "due_beyond_30_days",
  "no_due_date",
] as const;

export const dueBucketSchema = z.enum(DUE_BUCKETS);
export type DueBucket = z.infer<typeof dueBucketSchema>;

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: "Overdue",
  due_within_7_days: "Due ≤ 7 days",
  due_within_30_days: "Due ≤ 30 days",
  due_beyond_30_days: "Due > 30 days",
  no_due_date: "No date",
};

/**
 * FR-AN-03's green/amber/red, widened to the five states the prototype
 * actually renders. `caution` exists because `RAG()` distinguishes "due ≤ 30
 * days" (`#E0B000`) from "due ≤ 7 days" (`#D97706`) — two ambers — and
 * collapsing them here would lose a distinction the screen makes.
 */
export const STATUS_TONES = [
  "critical",
  "warning",
  "caution",
  "positive",
  "neutral",
] as const;

export const statusToneSchema = z.enum(STATUS_TONES);
export type StatusTone = z.infer<typeof statusToneSchema>;

export const DUE_BUCKET_TONE: Record<DueBucket, StatusTone> = {
  overdue: "critical",
  due_within_7_days: "warning",
  due_within_30_days: "caution",
  due_beyond_30_days: "positive",
  no_due_date: "neutral",
};

/**
 * One compliance category and its open items split by bucket.
 *
 * `code` is an **open string, not an enum**, and that is a decision rather than
 * laziness. The prototype names seven (Active Force, Active AOF, ICC in DFT,
 * ICC in EPI, Live Temp MOC, SMITH Lock, CSO/CSC), but **FR-AN-06** marks the
 * counting definitions *"to be confirmed"* — closing the set now would make
 * this build fail to parse a page the moment the client confirms an eighth.
 * `features/summaries` closes its section enum for the opposite reason:
 * FR-SUM-01 names exactly four in words.
 *
 * `buckets` is a list rather than the prototype's positional `b:[2,3,4,1,0]`.
 * A positional array on the wire means a reordered `RAG()` silently relabels
 * every count.
 */
export const complianceCategoryWireSchema = z.object({
  code: z.string(),
  label: z.string(),
  buckets: z.array(
    z.object({
      bucket: dueBucketSchema,
      count: z.number().int().nonnegative(),
    })
  ),
});

export const complianceCategorySchema = complianceCategoryWireSchema;

export type ComplianceCategoryWire = z.infer<
  typeof complianceCategoryWireSchema
>;
export type ComplianceCategory = z.infer<typeof complianceCategorySchema>;

/**
 * Structurally an identity map — every field of this record is already a single
 * word. It exists anyway so that every entity in this file is consumed through
 * the same `toX()` seam: when the real contract lands and one of these names
 * turns out to be `due_buckets`, the change is this function and nothing that
 * imports it.
 */
export const toComplianceCategory = (
  wire: ComplianceCategoryWire
): ComplianceCategory => ({
  code: wire.code,
  label: wire.label,
  buckets: wire.buckets.map((entry) => ({
    bucket: entry.bucket,
    count: entry.count,
  })),
});

/* -------------------------------------------------------------------------- */
/* Equipment out of service                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What "Expected Return" says. The prototype stores it as free text and then
 * sniffs the first character to decide how to render it —
 * `r[3][0]>='0'&&r[3][0]<='9'` (app-source.txt 1947) — so `'18 Jul 2026'`
 * renders as a date and `'TBC'` / `'Next S/D'` render as muted prose.
 *
 * A char-code test on display text is not a contract. Naming the three cases
 * makes the distinction the screen already draws parseable, and it survives
 * translation — NFR-07 requires Arabic, where that sniff decides nothing.
 */
export const RETURN_DATE_KINDS = [
  "scheduled",
  "to_be_confirmed",
  "next_shutdown",
] as const;

export const returnDateKindSchema = z.enum(RETURN_DATE_KINDS);
export type ReturnDateKind = z.infer<typeof returnDateKindSchema>;

/**
 * One out-of-service tag. `expected_return_at` is non-null only when
 * `expected_return_kind` is `scheduled`; the other two kinds are the *reason*
 * there is no date.
 *
 * The three tiles above this table in the prototype — total out of service, no
 * return date, needs shutdown — are **derived from these rows** (count, count
 * of `to_be_confirmed`, count of `next_shutdown`) and deliberately absent from
 * the wire. Carrying both the rows and their own totals invites a response
 * whose header disagrees with its body.
 */
export const equipmentOutOfServiceWireSchema = z.object({
  tag: z.string(),
  area: z.string(),
  out_since: z.string(),
  expected_return_kind: returnDateKindSchema,
  expected_return_at: z.string().nullable(),
});

export const equipmentOutOfServiceSchema = z.object({
  tag: z.string(),
  area: z.string(),
  outSince: z.string(),
  expectedReturnKind: returnDateKindSchema,
  expectedReturnAt: z.string().nullable(),
});

export type EquipmentOutOfServiceWire = z.infer<
  typeof equipmentOutOfServiceWireSchema
>;
export type EquipmentOutOfService = z.infer<typeof equipmentOutOfServiceSchema>;

export const toEquipmentOutOfService = (
  wire: EquipmentOutOfServiceWire
): EquipmentOutOfService => ({
  tag: wire.tag,
  area: wire.area,
  outSince: wire.out_since,
  expectedReturnKind: wire.expected_return_kind,
  expectedReturnAt: wire.expected_return_at,
});

/**
 * The "By area" bar beside the table. Carried rather than derived — unlike the
 * tiles above, this one is **not** reconstructible from the rows: the rows are
 * this shift's tags, while the bar is a plant-wide count whose denominator
 * FR-AN-06 has yet to define. Colour is gone; area is categorical, so the
 * render assigns the slot.
 */
export const areaCountWireSchema = z.object({
  area: z.string(),
  count: z.number().int().nonnegative(),
});

export const areaCountSchema = areaCountWireSchema;

export type AreaCountWire = z.infer<typeof areaCountWireSchema>;
export type AreaCount = z.infer<typeof areaCountSchema>;

export const toAreaCount = (wire: AreaCountWire): AreaCount => ({
  area: wire.area,
  count: wire.count,
});

/* -------------------------------------------------------------------------- */
/* Flare purge medium                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Two values because the screen's own note names exactly two: "Both areas
 * switched from N₂ to Fuel Gas on 03 Jun due to low V4801 level."
 */
export const PURGE_MEDIA = ["fuel_gas", "nitrogen"] as const;

export const purgeMediumSchema = z.enum(PURGE_MEDIA);
export type PurgeMedium = z.infer<typeof purgeMediumSchema>;

export const PURGE_MEDIUM_LABEL: Record<PurgeMedium, string> = {
  fuel_gas: "Fuel Gas",
  nitrogen: "N₂",
};

/**
 * `since` is when the area switched to the current medium — the prototype
 * renders "Fuel Gas · since 03 Jun 2026" and states the value is "derived from
 * [the] latest purge statement in Process/Superintendent logs", so it is an
 * extraction result, not a field anybody types.
 */
export const flarePurgeAreaWireSchema = z.object({
  area: z.string(),
  medium: purgeMediumSchema,
  since: z.string(),
});

export const flarePurgeAreaSchema = flarePurgeAreaWireSchema;

export type FlarePurgeAreaWire = z.infer<typeof flarePurgeAreaWireSchema>;
export type FlarePurgeArea = z.infer<typeof flarePurgeAreaSchema>;

export const toFlarePurgeArea = (wire: FlarePurgeAreaWire): FlarePurgeArea => ({
  area: wire.area,
  medium: wire.medium,
  since: wire.since,
});

/* -------------------------------------------------------------------------- */
/* OLET                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ **The least-specified thing on this screen, by its own admission.** The
 * prototype's card says: "OLET is all-zero across the supplied extract (135
 * occurrences, every one a zero count). **Definition and columns pending client
 * confirmation.**"
 *
 * So this carries a count and nothing else. Modelling the columns nobody has
 * confirmed would be inventing a requirement — `08-product-requirements.md`
 * forbids exactly that, and FR-AN-06's "definitions to be confirmed" is the
 * BRD saying the same thing in its own words. When the definition arrives this
 * schema grows; until then the zero is the honest answer.
 */
export const oletSummaryWireSchema = z.object({
  count: z.number().int().nonnegative(),
});

export const oletSummarySchema = oletSummaryWireSchema;

export type OletSummaryWire = z.infer<typeof oletSummaryWireSchema>;
export type OletSummary = z.infer<typeof oletSummarySchema>;

export const toOletSummary = (wire: OletSummaryWire): OletSummary => ({
  count: wire.count,
});

/* -------------------------------------------------------------------------- */
/* Next ships                                                                  */
/* -------------------------------------------------------------------------- */

/** The prototype's two states: a confirmed slot, or a provisional one. */
export const SHIP_ARRIVAL_STATUSES = ["scheduled", "provisional"] as const;

export const shipArrivalStatusSchema = z.enum(SHIP_ARRIVAL_STATUSES);
export type ShipArrivalStatus = z.infer<typeof shipArrivalStatusSchema>;

/**
 * `eta` is an instant, not the prototype's display string `'26 Jun · 02:00'`.
 * A pre-formatted date on the wire cannot be re-rendered in Arabic (NFR-07)
 * and cannot be compared, sorted or filtered — `mocks/shifts/current.test.ts`
 * settled the same point for shift boundaries: the wire value stays a UTC
 * instant and the plant-time rendering happens at the edge.
 */
export const shipArrivalWireSchema = z.object({
  vessel: z.string(),
  eta: z.string(),
  status: shipArrivalStatusSchema,
});

export const shipArrivalSchema = shipArrivalWireSchema;

export type ShipArrivalWire = z.infer<typeof shipArrivalWireSchema>;
export type ShipArrival = z.infer<typeof shipArrivalSchema>;

export const toShipArrival = (wire: ShipArrivalWire): ShipArrival => ({
  vessel: wire.vessel,
  eta: wire.eta,
  status: wire.status,
});

/* -------------------------------------------------------------------------- */
/* The screen's one response                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `GET /trends` answers the whole screen in one call, matching the prototype:
 * `trends()` renders five sections from one render pass with no independent
 * loading states between them.
 *
 * Not paginated. Every section is a bounded set — five KPIs, seven categories,
 * two flare areas — so `paginatedSchema` would describe a page that never has
 * a second one.
 */
export const trendsSummaryWireSchema = z.object({
  /** Echoes the requested window, so a stale response is detectable. */
  period: z.string(),
  production_kpis: z.array(productionKpiWireSchema),
  compliance_categories: z.array(complianceCategoryWireSchema),
  equipment_out_of_service: z.array(equipmentOutOfServiceWireSchema),
  equipment_out_of_service_by_area: z.array(areaCountWireSchema),
  flare_purge_areas: z.array(flarePurgeAreaWireSchema),
  olet: oletSummaryWireSchema,
  next_ships: z.array(shipArrivalWireSchema),
});

export const trendsSummarySchema = z.object({
  period: z.string(),
  productionKpis: z.array(productionKpiSchema),
  complianceCategories: z.array(complianceCategorySchema),
  equipmentOutOfService: z.array(equipmentOutOfServiceSchema),
  equipmentOutOfServiceByArea: z.array(areaCountSchema),
  flarePurgeAreas: z.array(flarePurgeAreaSchema),
  olet: oletSummarySchema,
  nextShips: z.array(shipArrivalSchema),
});

export type TrendsSummaryWire = z.infer<typeof trendsSummaryWireSchema>;
export type TrendsSummary = z.infer<typeof trendsSummarySchema>;

export const toTrendsSummary = (wire: TrendsSummaryWire): TrendsSummary => ({
  period: wire.period,
  productionKpis: wire.production_kpis.map(toProductionKpi),
  complianceCategories: wire.compliance_categories.map(toComplianceCategory),
  equipmentOutOfService: wire.equipment_out_of_service.map(
    toEquipmentOutOfService
  ),
  equipmentOutOfServiceByArea:
    wire.equipment_out_of_service_by_area.map(toAreaCount),
  flarePurgeAreas: wire.flare_purge_areas.map(toFlarePurgeArea),
  olet: toOletSummary(wire.olet),
  nextShips: wire.next_ships.map(toShipArrival),
});

export const trendsSummaryResponseSchema = envelopeSchema(
  trendsSummaryWireSchema
);

/* -------------------------------------------------------------------------- */
/* Requests the client sends                                                   */
/* -------------------------------------------------------------------------- */

/** The prototype's three period pills (`trendPeriod`, app-source.txt 1972). */
export const TREND_PERIODS = ["7d", "14d", "30d"] as const;

export const trendPeriodSchema = z.enum(TREND_PERIODS);
export type TrendPeriod = z.infer<typeof trendPeriodSchema>;

/**
 * **FR-AN-02** — "Provide trend dashboards with **date-range selection and
 * drill-down by area, equipment, shift**."
 *
 * ⚠️ **The prototype is narrower than the requirement it implements**, and the
 * gap is named here rather than quietly inherited. It offers three fixed period
 * pills and no drill-down at all; FR-AN-02 asks for a date range and three
 * drill-down dimensions, and **FR-REP-05** repeats the same four filters for
 * reports. Where the two disagree the BRD wins
 * (`08-product-requirements.md`), so the filter set is modelled to the
 * requirement and the pills become one preset over it.
 *
 * `area`, `equipment` and `shift` follow `summaryFiltersSchema`'s convention:
 * empty string means unfiltered, so the shape is stable across a form reset.
 * Their **spelling is PROVISIONAL** — the requirement is quoted, the param
 * names are inferred, exactly as `ASSISTANT.FEEDBACK` is in `constants/api.ts`.
 */
export const trendFiltersSchema = z.object({
  period: trendPeriodSchema,
  area: z.string(),
  equipment: z.string(),
  shift: z.string(),
});

export type TrendFilters = z.infer<typeof trendFiltersSchema>;

/**
 * **FR-REP-03** — "Export reports and query results to **PDF, Excel and
 * Word**". The prototype's Export button only toasts "Trends exported as PDF";
 * the requirement names three formats, and FR-REP-06 additionally requires
 * every export to be recorded in the audit trail — which is the backend's half.
 *
 * Reuses no import from `features/summaries` on purpose: FR-SUM-09 and
 * FR-REP-03 are separate requirements that happen to agree today, and a shared
 * constant would make one silently follow the other if either changes.
 */
export const TREND_EXPORT_FORMATS = ["pdf", "excel", "word"] as const;
export const trendExportFormatSchema = z.enum(TREND_EXPORT_FORMATS);
export type TrendExportFormat = z.infer<typeof trendExportFormatSchema>;
