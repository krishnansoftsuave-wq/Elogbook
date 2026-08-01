import { z } from "zod";

import {
  trendPeriodSchema,
  type TrendsSummaryWire,
} from "@/features/trends/schemas";
import { mockRoute, okJson, validationError } from "@/mocks/handler";
import {
  PERIOD_WINDOW_DAYS,
  seedComplianceCategories,
  seedEquipmentOutOfService,
  seedEquipmentOutOfServiceByArea,
  seedFlarePurgeAreas,
  seedNextShips,
  seedOlet,
  seedProductionKpis,
} from "@/mocks/data/trends";

/** Wrapped in an object so a bad value reports against the field name "period". */
const periodQuerySchema = z.object({ period: trendPeriodSchema });

/**
 * `GET /api/v1/trends` — §7.7, **FR-AN-02**'s trend dashboard.
 *
 * One call answers the whole screen, matching `trends()` (app-source.txt
 * 1901–1982): five sections rendered from a single pass, with no independent
 * loading state between them.
 *
 * **No `MockStoreData` entry.** Nothing on this screen is ever written, so
 * `mocks/data/trends.ts`'s pure `seedX` functions are enough — the mutable
 * store exists to make a write survive a refetch, and there is no write here
 * to survive.
 *
 * **The period selector is real here; it is not in the prototype.**
 * `trendPeriod` is set by the pills (app-source.txt 1907, `setState`) but
 * `trends()` never reads it back — the KPI section's heading is the hardcoded
 * literal `'Production KPIs — 7-Day Trend'` no matter which pill is active.
 * This is a **deliberate improvement over the prototype, not a transcription
 * gap**: `?period=` actually slices each KPI series to the requested window,
 * because a period control that visibly changes nothing is a defect the
 * moment somebody clicks it.
 *
 * Only the KPI strip has daily granularity to slice. The compliance,
 * equipment, flare, OLET and ships sections are all point-in-time snapshots
 * in the prototype's own state — none of them carry a history — so `period`
 * does not touch them, matching what the prototype actually shows regardless
 * of which pill is selected.
 */
export const GET = mockRoute({ permission: "report:read" }, ({ request }) => {
  const { searchParams } = new URL(request.url);

  // Absent defaults to "7d"; anything present that isn't 7d/14d/30d is a 422.
  const parsedPeriod = periodQuerySchema.safeParse({
    period: searchParams.get("period") ?? "7d",
  });
  if (!parsedPeriod.success) return validationError(parsedPeriod.error);

  const { period } = parsedPeriod.data;
  const windowDays = PERIOD_WINDOW_DAYS[period];
  const base = new Date();

  const summary: TrendsSummaryWire = {
    period,
    production_kpis: seedProductionKpis().map((kpi) => ({
      ...kpi,
      values: kpi.values.slice(-windowDays),
    })),
    compliance_categories: seedComplianceCategories(),
    equipment_out_of_service: seedEquipmentOutOfService(base),
    equipment_out_of_service_by_area: seedEquipmentOutOfServiceByArea(),
    flare_purge_areas: seedFlarePurgeAreas(base),
    olet: seedOlet(),
    next_ships: seedNextShips(base),
  };

  return okJson(summary);
});
