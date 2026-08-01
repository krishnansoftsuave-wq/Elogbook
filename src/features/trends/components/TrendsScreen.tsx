"use client";

import { Archive, CalendarX, Gauge } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionDenied } from "@/components/layout/PermissionDenied";
import { useCurrentShift } from "@/features/shifts/api/queries";
import { useTrends } from "@/features/trends/api/queries";
import { ComplianceSection } from "@/features/trends/components/ComplianceSection";
import { EquipmentFlareShipGrid } from "@/features/trends/components/EquipmentFlareShipGrid";
import {
  PERIOD_LABEL,
  PeriodPills,
} from "@/features/trends/components/PeriodPills";
import { ProductionKpiSection } from "@/features/trends/components/ProductionKpiSection";
import { TrendsExportMenu } from "@/features/trends/components/TrendsExportMenu";
import { TrendsSkeleton } from "@/features/trends/components/TrendsSkeleton";
import {
  DEFAULT_TREND_PERIOD,
  type TrendPeriod,
} from "@/features/trends/schemas";
import { getErrorMessage, getStatusCode } from "@/lib/api-error";
import { formatShiftDate } from "@/lib/datetime";

/**
 * §7.7 — Trends & KPIs (**FR-AN-02**), and the trend half of **FR-REP-01**. The
 * prototype's `trends` screen (`app-source.txt` 1876–1982).
 *
 * A client component, unlike its sibling routes in this group: `useTrends` is
 * called directly here rather than inside a feature container, because
 * `features/trends/api/queries.ts` explicitly leaves status branching — including
 * the 403 → `PermissionDenied` case — to "the caller", and this is that caller.
 * No try/catch: read errors are still toasted once, globally, by
 * `QueryCache.onError` (`lib/query-client.ts`); the branch below is additive, not
 * a replacement.
 *
 * `PageHeader` lives here rather than in `TrendsPage` (unlike
 * `SummariesPage`/`ActionsPage`, which keep it in the server route file): its
 * `description` is shift-aware and needs `useCurrentShift()`, which only a
 * client component can call. `TrendsPage` stays a thin server component so the
 * route still gets a real `<title>` via `metadata`.
 *
 * The subtitle avoids the prototype's hardcoded "24 Jun 2026" (`pageHead`,
 * app-source.txt 1971) — a fixed date goes stale within a week — in favour of
 * the live shift, the same source `ShiftContextBanner` reads. While that query
 * is still loading, the static fallback string covers the gap.
 *
 * Each section heading is `Icon` + `<h2>`, matching `SummarySections.tsx`'s
 * established shape for exactly the reason its own comment gives: `CardTitle`
 * (`ui/card.tsx`) renders a `<div>`, not a heading, so the section `<h2>` is
 * the only programmatic grouping a screen reader sees between the page's `h1`
 * and the cards themselves — dropping it, or its icon, breaks that chain
 * silently rather than visibly. Icons are the nearest lucide equivalent of
 * the prototype's Material glyph, not a pixel-identical substitute:
 * `speed` → `Gauge`, `event_busy` → `CalendarX` (a calendar-with-an-X, the
 * closest shape match to "busy/blocked"), `inventory_2` → `Archive`
 * (`app-source.txt` 1917/1974/1978).
 *
 * **`inventory_2` was `Boxes` before this, and that was a defect, not a
 * translation.** Material's `inventory_2` is a simple filled glyph at 17-20px;
 * `Boxes` is twelve separate SVG paths drawing three overlapping isometric
 * cubes with facet lines — genuinely the busiest icon lucide ships, confirmed
 * by counting primitives in `node_modules/lucide-react`, not by eye. At small
 * sizes the extra geometry reads as visual noise rather than more detail.
 *
 * **`Archive`, not `Package`.** `ComplianceSection`'s "Total open items" tile
 * had the exact same `Boxes` glyph a second time (`inventory`, a different
 * Material icon but the same lucide substitute) and needed the identical fix.
 * An earlier pass gave the two instances two different simple icons
 * (`Package` here, `Archive` there) to keep "equipment" and "a compliance
 * item count" visually distinct — deliberately reversed on request: the two
 * should read as the same concept, and `Archive` is the one to keep, so this
 * section now matches `ComplianceSection.tsx`'s icon exactly.
 *
 * **Geometry is `secTitle`'s own numbers** (`app-source.txt` 760):
 * `gap:9` → `gap-2.25`, `fontSize:14,fontWeight:700,color:C.tx` → `text-sm
 * font-bold text-foreground` (`text-sm` is Tailwind's own 14px step, not a
 * new token), icon `fontSize:19,color:C.teal` → `size-5` (a plain existing
 * step; `secTitle`'s 19 rounds to it rather than adding a one-off `size-4.75`
 * for a value the reference itself calls "roughly 20") and `text-primary`.
 *
 * **`strokeWidth={1.75}` is scoped to these three icons (and `StatTile`'s
 * `iconStrokeWidth`, for the `trendTile`-sourced tiles).** A first pass tried
 * `2.25`, reasoning that lucide's outline default (`2`) reads lighter than the
 * prototype's filled Material Icons. That reasoning held at 24px+ but not at
 * 17-20px: a heavier stroke at this size makes an outline glyph look
 * cluttered and bulkier rather than more solid, the opposite of the goal.
 * `1.75` is close enough to the default to stay clean while still reading a
 * touch more deliberate. `strokeWidth` is a per-icon prop, not a token, so
 * this is set explicitly rather than globally — every other icon on this
 * screen (card headers, row icons) stays at the library default.
 */
export const TrendsScreen = () => {
  const [period, setPeriod] = useState<TrendPeriod>(DEFAULT_TREND_PERIOD);
  const { data, error, isLoading, isFetching } = useTrends(period);
  const { data: shift, isLoading: isShiftLoading } = useCurrentShift();

  const description =
    isShiftLoading || !shift
      ? "Plant performance across the current shift."
      : `Plant performance · ${shift.label} shift · ${formatShiftDate(shift.shiftId.split("-")[0] ?? "")}`;

  let content: ReactNode = null;
  if (isLoading) {
    content = <TrendsSkeleton />;
  } else if (error) {
    content =
      getStatusCode(error) === 403 ? (
        <PermissionDenied message={getErrorMessage(error)} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Trends could not be loaded.
        </p>
      );
  } else if (data) {
    content = (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2.25 text-sm font-bold tracking-tight text-foreground">
            <Gauge
              className="size-5 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            Production KPIs — {PERIOD_LABEL[period]} Trend
          </h2>
          <ProductionKpiSection productionKpis={data.productionKpis} />
          {/* The prototype's own data-source footnote, app-source.txt 1919. */}
          <p className="text-xs text-muted-foreground">
            Extracted from Shift Superintendent &amp; Supervisor Process logs
            (jobtype 8, 10). Units differ (MM · Bar · t/d) so each metric is
            scaled independently. Daily point = latest declared value per shift.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2.25 text-sm font-bold tracking-tight text-foreground">
            <CalendarX
              className="size-5 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            Compliance &amp; Due-Date Status
          </h2>
          <ComplianceSection complianceCategories={data.complianceCategories} />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2.25 text-sm font-bold tracking-tight text-foreground">
            <Archive
              className="size-5 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            Equipment, Flare &amp; Shipping
          </h2>
          <EquipmentFlareShipGrid
            equipmentOutOfService={data.equipmentOutOfService}
            equipmentOutOfServiceByArea={data.equipmentOutOfServiceByArea}
            flarePurgeAreas={data.flarePurgeAreas}
            olet={data.olet}
            nextShips={data.nextShips}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: "Trends & KPIs" }]} />
      <PageHeader
        title="Trends & KPIs"
        description={description}
        actions={<TrendsExportMenu />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <span className="text-xs text-muted-foreground">Period</span>
        <PeriodPills
          value={period}
          onChange={setPeriod}
          disabled={isFetching}
        />
      </div>
      {content}
    </>
  );
};
