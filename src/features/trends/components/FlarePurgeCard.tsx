import { Flame, Gauge } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  PURGE_MEDIUM_LABEL,
  type FlarePurgeArea,
  type PurgeMedium,
} from "@/features/trends/schemas";
import { formatPlantTimestamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Flare Purge Medium — the prototype's `flareCard` (app-source.txt 1949–1954).
 *
 * Tone follows the `bg-<tone>/10 text-<tone>` shape `StatusPill.tsx` documents
 * as the established pattern for a status chip, rather than inventing a new
 * one. `nitrogen` gets `info` (a cool, "as expected" reading) and `fuel_gas`
 * gets `warning` (the medium the screen's own footnote flags as an active
 * deviation — "switched from N₂ to Fuel Gas … due to low V4801 level").
 *
 * **Title icon is `Gauge`**, the nearest lucide match for the prototype's
 * Material glyph `gas_meter` (no direct lucide equivalent exists). `Flame`
 * stays on each row's decorative badge — that one is about the flare itself,
 * not the metering concept the section title names.
 */

const MEDIUM_TONE_CLASS: Record<PurgeMedium, string> = {
  fuel_gas: "bg-warning/10 text-warning",
  nitrogen: "bg-info/10 text-info",
};

export interface FlarePurgeCardProps {
  flarePurgeAreas: readonly FlarePurgeArea[];
  className?: string;
}

export const FlarePurgeCard = ({
  flarePurgeAreas,
  className,
}: FlarePurgeCardProps) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Gauge className="size-4 text-primary" aria-hidden />
        Flare Purge Medium
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-2.5">
      {flarePurgeAreas.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No flare purge data"
          description="No flare area purge medium reported this shift."
        />
      ) : (
        flarePurgeAreas.map((area) => (
          <div
            key={area.area}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10"
              aria-hidden
            >
              <Flame className="size-4.5 text-warning" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {area.area}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {PURGE_MEDIUM_LABEL[area.medium]} · since{" "}
                {formatPlantTimestamp(area.since)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                MEDIUM_TONE_CLASS[area.medium]
              )}
            >
              {PURGE_MEDIUM_LABEL[area.medium]}
            </span>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);
