"use client";

import { CalendarDays, Factory, MapPin } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentShift } from "@/features/shifts/api/queries";
import { formatPlantTime, formatShiftDate } from "@/lib/datetime";

/**
 * The teal context strip at the top of the prototype's dashboard
 * (`app-source.txt` 1125–1128): plant, shift, scope.
 *
 * All three of its lines are hardcoded there — "OLNG — Plant Operations",
 * "24 Jun 2026 · DAY Shift", "Scope: Entire Plant — 3 Trains + Common Facilities
 * + Storage & Shipping". Two of the three are real here:
 *
 * - The **shift** line comes from `GET /shifts/current`, which is **FR-HOME-03**:
 *   "Define a shift as a 12-hour period (06:00–06:15 overlap)". The overlap is
 *   printed because it is the handover window — the thing this banner exists to
 *   tell an operator walking in.
 * - The **scope** line stays a fixed string, and stays *because* it is fixed.
 *   **FR-HOME-02** requires the view to default to "everything the user may see
 *   (full plant)", and §9.2 records that the client removed area-based
 *   filtering, so full-plant is not a selection that could read otherwise. There
 *   is no scope state to render.
 *
 * The plant name is likewise a constant, not configuration: this is Oman LNG's
 * platform, and no requirement makes the operator's employer a variable.
 *
 * Colour comes from theme tokens. The prototype's `C.tealDk` is a hex that
 * cannot answer to dark mode.
 */

const PLANT_NAME = "OLNG — Plant Operations";
const PLANT_SCOPE =
  "Entire plant — 3 trains, common facilities, storage & shipping";

export const ShiftContextBanner = () => {
  const { data: shift, isLoading } = useCurrentShift();

  return (
    /*
      `<div>`s, not `<p>`s. These are labelled data chips rather than prose, and
      the middle one holds a `Skeleton` — which renders a `<div>`, and a `<div>`
      inside a `<p>` is invalid HTML the browser silently reparents, breaking the
      layout. React reports it; the e2e run is where it surfaced.
    */
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-primary px-4 py-3 text-primary-foreground">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Factory className="size-4" aria-hidden />
        {PLANT_NAME}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <CalendarDays className="size-4" aria-hidden />
        {isLoading || !shift ? (
          <Skeleton className="h-4 w-56 bg-primary-foreground/20" />
        ) : (
          <span>
            {formatShiftDate(shift.shiftId.split("-")[0] ?? "")} · {shift.label}{" "}
            shift · {formatPlantTime(shift.startsAt)}–
            {formatPlantTime(shift.endsAt)} ·{" "}
            {/* FR-HOME-03's 06:00–06:15 handover window. */}
            {shift.overlapMinutes}-minute handover overlap
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <MapPin className="size-4" aria-hidden />
        Scope: {PLANT_SCOPE}
      </div>
    </div>
  );
};
