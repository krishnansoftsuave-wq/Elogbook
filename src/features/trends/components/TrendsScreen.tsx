"use client";

import { Boxes, CalendarX, Gauge } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionDenied } from "@/components/layout/PermissionDenied";
import { useCurrentShift } from "@/features/shifts/api/queries";
import { useTrends } from "@/features/trends/api/queries";
import { ComplianceSection } from "@/features/trends/components/ComplianceSection";
import { EquipmentFlareShipGrid } from "@/features/trends/components/EquipmentFlareShipGrid";
import { PeriodPills } from "@/features/trends/components/PeriodPills";
import { ProductionKpiSection } from "@/features/trends/components/ProductionKpiSection";
import { TrendsExportMenu } from "@/features/trends/components/TrendsExportMenu";
import { TrendsSkeleton } from "@/features/trends/components/TrendsSkeleton";
import type { TrendPeriod } from "@/features/trends/schemas";
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
 * closest shape match to "busy/blocked"), `inventory_2` → `Boxes`
 * (`app-source.txt` 1917/1974/1978).
 */
export const TrendsScreen = () => {
  const [period, setPeriod] = useState<TrendPeriod>("7d");
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
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Gauge className="size-4 text-muted-foreground" aria-hidden />
            Production KPIs — 7-Day Trend
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
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <CalendarX className="size-4 text-muted-foreground" aria-hidden />
            Compliance &amp; Due-Date Status
          </h2>
          <ComplianceSection complianceCategories={data.complianceCategories} />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Boxes className="size-4 text-muted-foreground" aria-hidden />
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
