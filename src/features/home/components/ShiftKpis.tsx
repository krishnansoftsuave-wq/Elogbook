"use client";

import { CircleCheck, Clock, ListChecks, TriangleAlert } from "lucide-react";

import { useActionStatusCounts } from "@/features/actions/api/queries";
import { StatTile } from "@/features/home/components/StatTile";

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
 * The group is a **named region**. Four bare numbers with no collective label
 * are hard to place when a screen reader reaches them out of visual context, and
 * the status words they use ("Open", "Verified") also appear in the donut's
 * legend beside them — so without a name, neither a reader nor a test can tell
 * which "Open" is which.
 */
export const ShiftKpis = () => {
  const { data, isLoading } = useActionStatusCounts();

  const value = (count: number | undefined): string =>
    count === undefined ? "—" : String(count);

  const isCapped = data !== undefined && data.counted < data.total;

  return (
    <section
      aria-label="Shift KPIs"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatTile
        label="Open"
        value={value(data?.byStatus.open)}
        icon={ListChecks}
        hint={isCapped ? CAPPED_HINT : undefined}
        isLoading={isLoading}
      />
      <StatTile
        label="In progress"
        value={value(data?.byStatus.in_progress)}
        icon={Clock}
        tone="text-info"
        hint={isCapped ? CAPPED_HINT : undefined}
        isLoading={isLoading}
      />
      <StatTile
        label="Overdue"
        value={value(data?.overdue)}
        icon={TriangleAlert}
        tone="text-destructive"
        hint={isCapped ? CAPPED_HINT : "Past due and not closed"}
        isLoading={isLoading}
      />
      <StatTile
        label="Verified"
        value={value(data?.byStatus.verified)}
        icon={CircleCheck}
        tone="text-success"
        hint={isCapped ? CAPPED_HINT : undefined}
        isLoading={isLoading}
      />

      {isCapped ? (
        <p className="col-span-full text-xs text-muted-foreground">
          Counts cover the {data.counted} most recent of {data.total} actions.
          Open the pending-actions list for the full set.
        </p>
      ) : null}
    </section>
  );
};
