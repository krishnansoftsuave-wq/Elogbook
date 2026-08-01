import { Sailboat, Ship as ShipIcon } from "lucide-react";

import { StatTile } from "@/components/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import type { ShipArrival, ShipArrivalStatus } from "@/features/trends/schemas";
import { formatPlantDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Next Ships — the prototype's `shipCard` (app-source.txt 1960–1967).
 *
 * `eta` is documented on the schema as a real instant (unlike, say,
 * `EquipmentOutOfService.outSince`), matching `mocks/shifts/current.test.ts`'s
 * rule that a wire timestamp is rendered in **plant time**
 * (`lib/datetime.ts`) rather than passed through as the prototype's
 * pre-formatted `'26 Jun · 02:00'` string.
 *
 * The status chip is a plain tone-mapped `<span>`, not `StatusPill`:
 * `StatusPill`'s union (`action` | `decision` | `request`) is deliberately
 * closed over the three entities that have a lifecycle a permission check
 * cares about, and widening it for a fourth, unrelated vocabulary here would
 * be scope creep on a shared component from this lane.
 *
 * The "Next arrival" tile is icon-left at 17px
 * (`iconPosition`/`iconSize`/`iconStrokeWidth`), matching `trendTile`
 * (`app-source.txt` 1896, `shipCard`'s own call at 1962) the same way every
 * other tile on this screen does — see `EquipmentOutOfServiceCard.tsx`'s
 * comment. The per-row `ShipIcon` below it is a different, already-correct
 * element (16px, `text-primary`) and is unaffected.
 */

const SHIP_STATUS_LABEL: Record<ShipArrivalStatus, string> = {
  scheduled: "Scheduled",
  provisional: "Provisional",
};

const SHIP_STATUS_TONE_CLASS: Record<ShipArrivalStatus, string> = {
  scheduled: "bg-accent text-accent-foreground",
  provisional: "bg-warning/10 text-warning",
};

export interface NextShipsCardProps {
  nextShips: readonly ShipArrival[];
  className?: string;
}

export const NextShipsCard = ({ nextShips, className }: NextShipsCardProps) => {
  const next = nextShips[0];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {/* 17px, not lucide's usual 16px `size-4` — `card()`'s `tIcon`
              (app-source.txt 176); see `EquipmentOutOfServiceCard.tsx`'s
              comment for the exact-px reasoning. */}
          <Sailboat className="size-4.25 text-primary" aria-hidden />
          Next Ships
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {next ? (
          <StatTile
            label="Next arrival"
            value={next.vessel}
            icon={Sailboat}
            hint={`ETA ${formatPlantDateTime(next.eta)}`}
            tone="text-primary"
            iconPosition="start"
            iconSize="size-4.25"
            iconStrokeWidth={1.75}
          />
        ) : (
          <EmptyState
            icon={Sailboat}
            title="No ships scheduled"
            description="Nothing on the arrivals board right now."
          />
        )}

        {nextShips.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {nextShips.map((ship) => (
              <li
                key={`${ship.vessel}-${ship.eta}`}
                className="flex items-center gap-2 text-sm"
              >
                <ShipIcon
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="flex-1 truncate font-medium text-foreground">
                  {ship.vessel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatPlantDateTime(ship.eta)}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold",
                    SHIP_STATUS_TONE_CLASS[ship.status]
                  )}
                >
                  {SHIP_STATUS_LABEL[ship.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
};
