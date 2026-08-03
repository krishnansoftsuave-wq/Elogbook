import { z } from "zod";

import type { ChartTone } from "@/components/charts/tones";
import { envelopeSchema } from "@/lib/zod";

/**
 * Plant operations — the prototype's `specKpiSection()` (app-source.txt 751):
 * due-date RAG, production trend, equipment out of service, flare purge medium,
 * OLET and the berthing schedule.
 *
 * ## ⚠️ No requirement covers any of this
 *
 * Every other schema in this repo cites an `FR-` id. This one cannot, and the
 * omission is the point. These six cards were delivered in the prototype and
 * never made it into BRD v1.3 — there is no requirement, no entity, and no
 * backend contract. **The owner asked for them to be built with mock data
 * anyway**, which is a legitimate call for a demo, and this file exists to make
 * that decision visible rather than to disguise it.
 *
 * Three consequences follow, and all three are deliberate:
 *
 * 1. **Every figure is invented.** The prototype holds them as literal arrays
 *    inside its own render functions (546–748) — not in `state` — so there was
 *    never an entity to derive a shape from. LNG production rates, equipment
 *    tags and vessel names here are illustrative and nothing else.
 * 2. ⚠️ **The screen no longer says so.** A `PlantOpsNotice` banner used to
 *    render above these cards; it was **removed at the owner's request** so the
 *    dashboard matches the prototype. The caveat now lives only in code — here,
 *    in `mocks/data/plantOps.ts`, and in `isIllustrativeWidget`. A berthing
 *    schedule reads as operational fact, and a screenshot outlives the
 *    conversation that explained it, so this is the risk that removal accepted.
 * 3. **The field names are guesses.** No contract constrains them, so treat
 *    every one as provisional in the strongest sense — not "unconfirmed" but
 *    "invented alongside the data".
 *
 * This should be raised with the client: either the six screens enter the BRD
 * and acquire real definitions, or they are dropped. They should not ship to
 * production in this state.
 */

/* -------------------------------------------------------------------------- */
/* Due-date RAG — prototype `dueCats` (547) / `RAG` (546)                      */
/* -------------------------------------------------------------------------- */

/** The five buckets, in the order the prototype stacks them. */
export const RAG_BUCKETS = [
  "overdue",
  "due_7_days",
  "due_30_days",
  "beyond_30_days",
  "no_date",
] as const;

export const RAG_LABEL: Record<(typeof RAG_BUCKETS)[number], string> = {
  overdue: "Overdue",
  due_7_days: "Due ≤ 7 days",
  due_30_days: "Due ≤ 30 days",
  beyond_30_days: "Due > 30 days",
  no_date: "No date",
};

/**
 * RAG bucket → chart tone, mapped **explicitly rather than by position**.
 *
 * `toneAt(index)` walks the `--chart-*` ramp in order, and that ramp is
 * *categorical* (teal, teal-light, amber, green, red) rather than ordered. Used
 * positionally here it painted **Overdue teal and No date red** — an inversion
 * that reads as the opposite of the truth, because red on a due-date chart
 * means "overdue" to everybody who looks at it.
 *
 * This is the prototype's ramp exactly — red → orange → yellow → green → grey
 * (`RAG` 546). The last two needed `--chart-6` and `--chart-7`, which were
 * added to the theme for this: an ordered scale cannot be built from a
 * categorical ramp without either reusing a hue or substituting a wrong one,
 * and a first attempt did the latter — teal for "Due ≤ 30 days" and teal for
 * "No date", which read as two unrelated categories rather than as a scale.
 */
export const RAG_TONE: Record<(typeof RAG_BUCKETS)[number], ChartTone> = {
  overdue: "chart-5",
  due_7_days: "chart-3",
  due_30_days: "chart-8",
  beyond_30_days: "chart-4",
  no_date: "chart-9",
};

/**
 * Production measure → chart tone, by **name** rather than by position, for the
 * same reason `RAG_TONE` exists: `toneAt(index)` gave the prototype's five
 * measures the first five tones of a teal-heavy ramp, so ADP and Spot came out
 * as two shades of the same colour and the two most-compared lines on the card
 * were the two hardest to tell apart.
 *
 * The prototype assigns each measure its own hue (`secKpiTrend` 685–689):
 * ADP `#0E8C81`, Spot `#2F73B5`, Average `#1E8E4E`, TLP `#7A3FA0`,
 * Flare `#D97706`. Two of those — the blue and the purple — had no token, which
 * is why `--chart-6` and `--chart-7` exist.
 *
 * Keyed on the wire `name`, not the display name: the caller appends the unit
 * (`"ADP (MM)"`) and a unit change would silently drop the colour. Unknown names
 * fall back to `toneAt`, so a measure the backend adds later still renders.
 */
export const PRODUCTION_TONE: Record<string, ChartTone> = {
  ADP: "chart-1",
  Spot: "chart-6",
  Average: "chart-4",
  TLP: "chart-7",
  Flare: "chart-3",
};

const dueCategoryWireSchema = z.object({
  label: z.string(),
  /** One count per `RAG_BUCKETS` entry, same order. */
  counts: z.array(z.number()),
});

/* -------------------------------------------------------------------------- */
/* The rest                                                                    */
/* -------------------------------------------------------------------------- */

const productionSeriesWireSchema = z.object({
  name: z.string(),
  unit: z.string(),
  points: z.array(z.number()),
});

const outOfServiceWireSchema = z.object({
  tag: z.string(),
  reason: z.string(),
  area: z.string(),
  out_since: z.string(),
  /** Free text: a real date, "TBC", or "Next S/D" — the prototype's own values. */
  expected_return: z.string(),
});

const flarePurgeWireSchema = z.object({
  area: z.string(),
  medium: z.enum(["fuel_gas", "nitrogen"]),
  since: z.string(),
  reason: z.string(),
});

const oletItemWireSchema = z.object({
  item: z.string(),
  equipment: z.string(),
  reason: z.string(),
  raised: z.string(),
  due: z.string(),
  reference: z.string(),
});

const shipWireSchema = z.object({
  vessel: z.string(),
  eta: z.string(),
  quantity: z.number(),
});

export const plantOperationsWireSchema = z.object({
  due_categories: z.array(dueCategoryWireSchema),
  production_days: z.array(z.string()),
  production_series: z.array(productionSeriesWireSchema),
  out_of_service: z.array(outOfServiceWireSchema),
  flare_purge: z.array(flarePurgeWireSchema),
  /** Seeded empty — the prototype ships this table in its empty state (721). */
  olet: z.array(oletItemWireSchema),
  next_ships: z.array(shipWireSchema),
});

export type PlantOperationsWire = z.infer<typeof plantOperationsWireSchema>;

export const plantOperationsResponseSchema = envelopeSchema(
  plantOperationsWireSchema
);

export interface PlantOperations {
  dueCategories: { label: string; counts: number[] }[];
  productionDays: string[];
  productionSeries: { name: string; unit: string; points: number[] }[];
  outOfService: {
    tag: string;
    reason: string;
    area: string;
    outSince: string;
    expectedReturn: string;
  }[];
  flarePurge: {
    area: string;
    medium: "fuel_gas" | "nitrogen";
    since: string;
    reason: string;
  }[];
  olet: {
    item: string;
    equipment: string;
    reason: string;
    raised: string;
    due: string;
    reference: string;
  }[];
  nextShips: { vessel: string; eta: string; quantity: number }[];
}

export const toPlantOperations = (
  wire: PlantOperationsWire
): PlantOperations => ({
  dueCategories: wire.due_categories,
  productionDays: wire.production_days,
  productionSeries: wire.production_series,
  outOfService: wire.out_of_service.map((row) => ({
    tag: row.tag,
    reason: row.reason,
    area: row.area,
    outSince: row.out_since,
    expectedReturn: row.expected_return,
  })),
  flarePurge: wire.flare_purge,
  olet: wire.olet,
  nextShips: wire.next_ships,
});
