"use client";

import { ChartPie } from "lucide-react";
import { useId } from "react";

import { Notice } from "@/components/Notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionStatusCounts } from "@/features/actions/api/queries";
import { MetricTile } from "@/features/monitoring/components/MetricTile";

/** Marks a tile whose number is a floor rather than a total. */
const CAPPED_HINT = "Partial count";

/**
 * "Shift KPIs" — the first widget the prototype's `dashWidgets` lists for the
 * operator dashboard (`app-source.txt` 112), and FR-HOME-01's "pending actions".
 *
 * The four numbers are chosen to answer what an operator starting a shift needs
 * to know: what is waiting, what is already moving, what is late, and what is
 * finished. Overdue is FR-PA-06's derived flag, given a tile of its own because
 * it is the only one of the four that is a problem rather than a state.
 *
 * Every tile shows a number the client counted from one capped page — see
 * `useActionStatusCounts`, which records why and what replaces it.
 *
 * **When that cap bites, the screen says so.** The hook already returns the
 * server's `total` alongside the `counted` rows, and discarding it was the
 * defect: past 100 open actions the tiles would read "Open 62" with nothing to
 * suggest the number was a floor. A JSDoc warns the next developer; it does not
 * warn the operator making a handover decision.
 *
 * ## Two changes made by comparing against the running prototype
 *
 * **The tiles are inside a card.** Every other widget on the dashboard draws its
 * own card, and this one did not — so on the Super User's screen a row of four
 * bare tiles sat between two titled cards, reading as page furniture rather than
 * as the widget it is. `widgetBody`'s `'kpi'` case (306) is a titled card
 * containing the grid, and the card is also what makes FR-DASH-04's hide and
 * resize controls land on something coherent.
 *
 * **The tiles no longer carry icons.** The prototype's KPI tile is label,
 * number, caption and nothing else (306–309). The icons here were chosen by feel
 * — a `TriangleAlert` for overdue, a `CircleCheck` for verified — and they
 * repeated in colour what the number's own tone already says. `MetricTile` is
 * the prototype's tile shape, already used by every figure on the monitoring
 * board, so this widget uses it instead of a private near-copy.
 *
 * The group keeps its **accessible name**, now from the card's own heading via
 * `aria-labelledby` rather than a second `aria-label` saying the same words.
 */
export const ShiftKpis = () => {
  const { data, isLoading, isError } = useActionStatusCounts();
  const titleId = useId();

  const value = (count: number | undefined): string =>
    count === undefined ? "—" : String(count);

  const isCapped = data !== undefined && data.counted < data.total;
  const capped = isCapped ? CAPPED_HINT : undefined;

  return (
    /*
      A named region, via the card's own heading rather than a duplicate
      `aria-label`. `Card` renders a plain `div`, so without the role the four
      numbers are ungrouped for a screen reader — and "Open" and "Verified" also
      appear in the pending-actions donut's legend, so an unnamed group leaves no
      way to tell which "Open" is which.
    */
    <Card className="min-w-0" role="region" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId} className="flex items-center gap-2">
          {/* `donut_small` — `widgetIcon('kpi')` (1166). */}
          <ChartPie className="size-5 text-primary" aria-hidden />
          Shift KPIs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/*
          Without this the widget renders four tiles reading "—" and looks
          loaded. `value()` maps `undefined` to an em dash and `isCapped` is
          false when there is no data, so a 500 from `/actions` produced a
          fully-formed card with no error, no retry and nothing announced —
          which an operator starting a handover reads as "nothing is open".
          Every sibling on this screen already shows a `Notice` instead.
        */}
        {isError ? (
          <Notice live>
            Shift KPIs could not be loaded. Reload to try again.
          </Notice>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Open"
              value={value(data?.byStatus.open)}
              caption={capped}
              isLoading={isLoading}
            />
            <MetricTile
              label="In progress"
              value={value(data?.byStatus.in_progress)}
              tone="brand"
              caption={capped}
              isLoading={isLoading}
            />
            <MetricTile
              label="Overdue"
              value={value(data?.overdue)}
              tone="critical"
              caption={capped ?? "Past due and not closed"}
              isLoading={isLoading}
            />
            <MetricTile
              label="Verified"
              value={value(data?.byStatus.verified)}
              tone="success"
              caption={capped}
              isLoading={isLoading}
            />

            {isCapped ? (
              <p className="col-span-full text-xs text-muted-foreground">
                Counts cover the {data.counted} most recent of {data.total}{" "}
                actions. Open the pending-actions list for the full set.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
