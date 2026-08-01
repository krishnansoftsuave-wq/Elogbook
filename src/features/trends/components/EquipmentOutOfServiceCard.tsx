import { CalendarX, HardHat, Wrench } from "lucide-react";

import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { toneAt, type ChartTone } from "@/components/charts/tones";
import { StatTile } from "@/components/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import type {
  AreaCount,
  EquipmentOutOfService,
} from "@/features/trends/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Equipment Out of Service — the prototype's `oosCard` (app-source.txt
 * 1930–1947): three derived tiles, a "by area" bar, then the tag list.
 *
 * **Table, not `DataTable`.** `AGENTS.md`'s rule is "tables go through
 * `DataTable`", written for a query-backed, paginated listing. This one is a
 * bounded slice of one `GET /trends` response — a handful of rows, no
 * independent fetch, no page state to own — so `manualPagination` would be
 * paging a list that never has a second page. A plain semantic `<table>`
 * inside its own `overflow-x-auto` (`.claude/rules/01`'s "no horizontal page
 * scroll" clause) is the honest shape for that, the same call `DataTable`
 * itself would make with `manualPagination: false` and no pager rendered.
 *
 * **Tiles are derived from the rows**, not carried separately — the schema's
 * own docblock says why: "carrying both the rows and their own totals invites
 * a response whose header disagrees with its body."
 *
 * **"By area" as a single-bucket `StackedBarChart`.** `equipmentOutOfServiceByArea`
 * is one count per area — there is no second series to stack — so it is a
 * one-bucket call to the column chart rather than reaching for the horizontal
 * variant meant for a multi-bucket breakdown. `unit` is `"items"` so each
 * total reads "3 items" not a bare "3", and the legend is off — both match
 * the prototype's `oosArea` call exactly
 * (`this.iBar('oosArea',oosByArea,{unit:'items',…})`, app-source.txt 1946).
 *
 * **Per-area colour is the prototype's own literal table**, not a cycled
 * assignment: `oosByArea` (app-source.txt 1930) hardcodes one hex per named
 * area — Train 2 `#2F73B5` (blue), Train 3 `#7A3FA0` (purple), Common Fac.
 * `#0E8C81` (teal), Storage `#6B4A9A` (a second, distinct purple). Train 3
 * and Storage landing in the same `chart-7` tone is therefore deliberate,
 * not a collision to fix — both prototype hexes are already close enough in
 * hue that this build's tone ramp has one purple slot for both, and forcing
 * Storage onto a different hue would invent a distinction the prototype
 * doesn't draw. An area outside this table (a fixture change, a new site)
 * falls back to `toneAt`, the general "assign the Nth item a tone"
 * mechanism, rather than rendering unstyled.
 */

const AREA_TONE: Record<string, ChartTone> = {
  "Train 2": "chart-6",
  "Train 3": "chart-7",
  "Common Fac.": "chart-1",
  Storage: "chart-7",
};

/**
 * `outSince` / `expectedReturnAt` are formatted with `formatPlantTimestamp`
 * (the long form, year included — a return date can sit months out): both
 * fields are built by `mocks/data/trends.ts` with `daysFromBase`, the same
 * full-ISO-instant helper `ShipArrival.eta` uses (formatted there with the
 * shorter `formatPlantDateTime`), so they carry the same shape this build's
 * fixture actually commits to, even though the wire schema's own PROVISIONAL
 * types leave the field a bare `string`. Rendering the raw ISO
 * value ("2026-07-11T11:11:27.748+00:00") was a real, confirmed display
 * defect — verbose and hard to scan — not a deliberate choice.
 */

const RETURN_DISPLAY: Record<
  EquipmentOutOfService["expectedReturnKind"],
  (row: EquipmentOutOfService) => { text: string; emphasize: boolean }
> = {
  scheduled: (row) => ({
    text: row.expectedReturnAt
      ? formatPlantTimestamp(row.expectedReturnAt)
      : "—",
    emphasize: true,
  }),
  to_be_confirmed: () => ({ text: "TBC", emphasize: false }),
  next_shutdown: () => ({ text: "Next shutdown", emphasize: false }),
};

export interface EquipmentOutOfServiceCardProps {
  equipmentOutOfService: readonly EquipmentOutOfService[];
  equipmentOutOfServiceByArea: readonly AreaCount[];
  className?: string;
}

export const EquipmentOutOfServiceCard = ({
  equipmentOutOfService,
  equipmentOutOfServiceByArea,
  className,
}: EquipmentOutOfServiceCardProps) => {
  const total = equipmentOutOfService.length;
  const noReturnDate = equipmentOutOfService.filter(
    (row) => row.expectedReturnKind === "to_be_confirmed"
  ).length;
  const needsShutdown = equipmentOutOfService.filter(
    (row) => row.expectedReturnKind === "next_shutdown"
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="size-4 text-primary" aria-hidden />
          Equipment Out of Service
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="Total out of service"
            value={String(total)}
            icon={Wrench}
            hint={`${total} tags this shift`}
            tone="text-primary"
          />
          <StatTile
            label="No return date"
            value={String(noReturnDate)}
            icon={CalendarX}
            hint="marked TBC"
            tone="text-warning"
          />
          <StatTile
            label="Needs shutdown"
            value={String(needsShutdown.length)}
            icon={HardHat}
            hint={needsShutdown[0]?.tag}
            tone="text-destructive"
          />
        </div>

        {equipmentOutOfServiceByArea.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-foreground">By area</p>
            <StackedBarChart
              label="Equipment out of service by area"
              categoryHeader="Area"
              unit="items"
              showLegend={false}
              buckets={[{ name: "Out of service", tone: "chart-1" }]}
              categories={equipmentOutOfServiceByArea.map((area, index) => ({
                label: area.area,
                values: [area.count],
                tone: AREA_TONE[area.area] ?? toneAt(index),
              }))}
            />
          </div>
        ) : null}

        {equipmentOutOfService.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No equipment out of service"
            description="Every tag is in service this shift."
          />
        ) : (
          // `tabIndex={0}` + `role="region"`: a horizontally-clipped table is
          // otherwise unreachable by a keyboard-only user with no mouse to
          // drag the scrollbar (WCAG 2.1.1) — the WAI scrollable-region
          // pattern.
          <div
            role="region"
            aria-label="Equipment out of service, scrollable"
            tabIndex={0}
            className="overflow-x-auto rounded-lg border border-border focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Equipment currently out of service, with tag, area, out-since
                date and expected return
              </caption>
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Tag
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Area
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    Out Since
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 font-semibold whitespace-nowrap"
                  >
                    Expected Return
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipmentOutOfService.map((row) => {
                  const returnInfo =
                    RETURN_DISPLAY[row.expectedReturnKind](row);

                  return (
                    <tr
                      key={row.tag}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {row.tag}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.area}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatPlantTimestamp(row.outSince)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 whitespace-nowrap",
                          returnInfo.emphasize
                            ? "font-semibold text-warning"
                            : "text-muted-foreground"
                        )}
                      >
                        {returnInfo.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
