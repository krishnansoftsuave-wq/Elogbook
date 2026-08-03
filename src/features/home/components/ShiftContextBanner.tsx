"use client";

// `factory`, `event`, `my_location` — the prototype's own three glyphs
// (app-source.txt 1126–1128), read out of the Material font it embeds rather
// than approximated with lucide.
import { Event, Factory, MyLocation } from "@/components/icons/material";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentShift } from "@/features/shifts/api/queries";
import { formatShiftDate } from "@/lib/datetime";

/**
 * The teal context strip at the top of the prototype's dashboard
 * (`app-source.txt` 1125–1128): plant, shift, scope.
 *
 * All three of its lines are hardcoded there — "OLNG — Plant Operations",
 * "24 Jun 2026 · DAY Shift", "Scope: Entire Plant — 3 Trains + Common Facilities
 * + Storage & Shipping. **The wording, capitalisation and separators below are
 * that text verbatim**, at the owner's instruction; an earlier version
 * paraphrased it into sentence case with comma separators, which is a different
 * string on a screen the client has already reviewed.
 *
 * Two of the three lines are real:
 *
 * - The **shift** line comes from `GET /shifts/current`, formatted to the
 *   prototype's `"<date> · <LABEL> Shift"` shape.
 * - The **scope** line stays a fixed string, and stays *because* it is fixed.
 *   **FR-HOME-02** requires the view to default to "everything the user may see
 *   (full plant)", and §9.2 records that the client removed area-based
 *   filtering, so full-plant is not a selection that could read otherwise. There
 *   is no scope state to render.
 *
 * The plant name is likewise a constant, not configuration: this is Oman LNG's
 * platform, and no requirement makes the operator's employer a variable.
 *
 * ⚠️ **The handover-overlap clause was removed to match.** This line used to
 * read "… · 18:00 GST–06:00 GST · 15-minute handover overlap", carrying
 * **FR-HOME-03**'s overlap window. The requirement defines a shift as a 12-hour
 * period with a 06:00–06:15 overlap — it does not require the banner to print
 * it, and `useCurrentShift` still returns `overlapMinutes` for whatever does. But
 * the handover window is no longer stated anywhere an operator walking in will
 * see it, which is worth a decision before sign-off rather than a silent loss.
 *
 * Colour is `--brand-surface-deep`, a token added for this: `C.tealDk` used as a
 * *background*. `--brand-dark` is the same hex but means "the emphatic teal" for
 * text, so it inverts to a bright teal in dark mode and would leave white text
 * on it unreadable.
 */

const PLANT_NAME = "OLNG — Plant Operations";
const PLANT_SCOPE =
  "Entire Plant — 3 Trains + Common Facilities + Storage & Shipping";

export const ShiftContextBanner = () => {
  const { data: shift, isLoading } = useCurrentShift();

  return (
    /*
      `<div>`s, not `<p>`s. These are labelled data chips rather than prose, and
      the middle one holds a `Skeleton` — which renders a `<div>`, and a `<div>`
      inside a `<p>` is invalid HTML the browser silently reparents, breaking the
      layout. React reports it; the e2e run is where it surfaced.
    */
    <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2 rounded-lg bg-brand-surface-deep px-4 py-3 text-xs text-on-brand">
      {/* `gap:18` and `fontSize:12.5` above — 4.5 is exactly 18px on the
          spacing scale; 12.5px has no token, and `text-xs` is the nearest. */}
      <div className="flex items-center gap-1.75 font-semibold">
        <Factory className="size-4" aria-hidden />
        {PLANT_NAME}
      </div>

      {/* `opacity:.92` on the second and third spans — the prototype's own
          de-emphasis of the two lines that qualify the first. */}
      <div className="flex items-center gap-1.75 opacity-92">
        <Event className="size-4" aria-hidden />
        {isLoading || !shift ? (
          <Skeleton className="h-4 w-44 bg-on-brand/20" />
        ) : (
          <span>
            {formatShiftDate(shift.shiftId.split("-")[0] ?? "")} ·{" "}
            {shift.label.toUpperCase()} Shift
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.75 opacity-92">
        <MyLocation className="size-4" aria-hidden />
        Scope: {PLANT_SCOPE}
      </div>
    </div>
  );
};
