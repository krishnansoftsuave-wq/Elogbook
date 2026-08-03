import type { PlantOperationsWire } from "@/features/plant-ops/schemas";

/**
 * ⚠️ **Every figure below is invented.**
 *
 * Transcribed from the prototype's `specKpiSection()` render functions
 * (app-source.txt 546–748), which is the only source there is: the values live
 * as literal arrays inside those functions rather than in `state`, so there was
 * never a fixture to copy — only a drawing to read numbers off.
 *
 * No BRD requirement covers these six screens (see `features/plant-ops/schemas.ts`).
 * They are built at the owner's explicit request for demonstration. Nothing here
 * is a measurement, an equipment record, or a berthing commitment:
 *
 * - **Production rates** are plausible LNG figures with no source.
 * - **Equipment tags** (`2P-1401A`, `KD4086`) follow OLNG's naming convention
 *   and identify nothing.
 * - **Vessel names and ETAs** are the prototype's. No shipping schedule was
 *   consulted, and treating these as a berthing plan would be a safety issue,
 *   not just an accuracy one.
 *
 * Dates are kept verbatim from the prototype rather than made relative to
 * `base`, unlike every other seed in this folder. That is deliberate: a
 * fabricated record that silently follows today's date reads as current, and
 * these should read as the sample they are.
 */
export const seedPlantOperations = (): PlantOperationsWire => ({
  // `dueCats` (547) — counts per RAG bucket, in `RAG_BUCKETS` order.
  due_categories: [
    { label: "Active Force", counts: [2, 3, 4, 1, 0] },
    { label: "Active AOF", counts: [1, 2, 2, 1, 0] },
    { label: "ICC in DFT", counts: [0, 1, 1, 0, 0] },
    { label: "ICC in EPI", counts: [3, 4, 7, 3, 1] },
    { label: "Live Temp MOC", counts: [1, 2, 9, 8, 1] },
    { label: "SMITH Lock", counts: [0, 1, 3, 2, 0] },
    { label: "CSO/CSC", counts: [1, 2, 2, 1, 1] },
  ],

  // `secKpiTrend` (683–691).
  production_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  production_series: [
    { name: "ADP", unit: "MM", points: [42, 43, 45, 44, 46, 43, 44] },
    { name: "Spot", unit: "MM", points: [37, 38, 40, 39, 41, 38, 39] },
    {
      name: "Average",
      unit: "MM",
      points: [50, 50.5, 51, 51.2, 51.5, 51, 51.2],
    },
    {
      name: "TLP",
      unit: "Bar",
      points: [71.6, 72, 73.3, 72.8, 74, 71.8, 72],
    },
    { name: "Flare", unit: "t/d", points: [0, 0, 1.2, 0, 0, 0.6, 0] },
  ],

  // `outOfServiceCard` (705–715).
  out_of_service: [
    {
      tag: "2P-1401A",
      reason: "Single-phase trip — removed to workshop for overhaul",
      area: "Train 2",
      out_since: "03 Jun 2026",
      expected_return: "18 Jul 2026",
    },
    {
      tag: "2E-1104C",
      reason: "Isolated — low motor IR, overhaul required",
      area: "Train 2",
      out_since: "05 Jun 2026",
      expected_return: "TBC",
    },
    {
      tag: "2E-1313A",
      reason: "Heater earth fault — requires shutdown",
      area: "Train 2",
      out_since: "06 Jun 2026",
      expected_return: "Next S/D",
    },
    {
      tag: "3PM-1425",
      reason: "Pulley & belt inspection in progress",
      area: "Train 3",
      out_since: "07 Jun 2026",
      expected_return: "20 Jul 2026",
    },
    {
      tag: "K4061A",
      reason: "Pulley and belt inspection",
      area: "Common Fac.",
      out_since: "04 Jun 2026",
      expected_return: "15 Jul 2026",
    },
    {
      tag: "KD4086",
      reason: "Removed to workshop to repair",
      area: "Common Fac.",
      out_since: "02 Jun 2026",
      expected_return: "TBC",
    },
    {
      tag: "Elevator (Tank 1)",
      reason: "Out of service — 3-way valve malfunction",
      area: "Storage",
      out_since: "01 Jun 2026",
      expected_return: "12 Jul 2026",
    },
  ],

  // `flarePurgeCard` (725–738).
  flare_purge: [
    {
      area: "Flare Area 1",
      medium: "fuel_gas",
      since: "03 Jun 2026",
      reason: "Switched from N₂ due to low V4801 level",
    },
    {
      area: "Flare Area 2",
      medium: "nitrogen",
      since: "03 Jun 2026",
      reason: "N₂ purge in service",
    },
  ],

  /*
    Empty, exactly as the prototype ships it (`oletCard` 719–722, whose comment
    reads "empty state per spec"). Inventing OLET rows to make the card look
    populated would fabricate a category of finding nobody asked for — and the
    empty state is the more useful thing to demonstrate anyway, since it is the
    one this table will show most shifts.
  */
  olet: [],

  // `nextShipCard` (741–748).
  next_ships: [
    { vessel: "Myrina LNG", eta: "26 Jun 2026 · 02:00", quantity: 1 },
    { vessel: "Nizwa LNG", eta: "29 Jun 2026 · 10:00", quantity: 1 },
    { vessel: "Flex Ranger", eta: "02 Jul 2026 · 14:00", quantity: 1 },
  ],
});
