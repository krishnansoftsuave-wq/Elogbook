import { ClipboardList } from "lucide-react";

import { StatTile } from "@/components/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OletSummary } from "@/features/trends/schemas";

/**
 * OLET — the prototype's `oletCard` (app-source.txt 1956–1958).
 *
 * The schema's own docblock is blunt about this one: OLET is all-zero across
 * the supplied extract, and its "definition and columns" are pending client
 * confirmation (**FR-AN-06**). So this renders exactly the one number the wire
 * carries and repeats that caveat — it does not invent columns nobody has
 * confirmed.
 *
 * The tile is icon-left at 17px (`iconPosition`/`iconSize`/`iconStrokeWidth`),
 * matching `trendTile` (`app-source.txt` 1896, `oletCard`'s own call at 1957)
 * the same way every other tile on this screen does — see
 * `EquipmentOutOfServiceCard.tsx`'s comment.
 */

export interface OletCardProps {
  olet: OletSummary;
  className?: string;
}

export const OletCard = ({ olet, className }: OletCardProps) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        {/* 17px, not lucide's usual 16px `size-4` — `card()`'s `tIcon`
            (app-source.txt 176); see `EquipmentOutOfServiceCard.tsx`'s
            comment for the exact-px reasoning. */}
        <ClipboardList className="size-4.25 text-primary" aria-hidden />
        OLET
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <StatTile
        label="OLET items"
        value={String(olet.count)}
        icon={ClipboardList}
        hint={olet.count === 0 ? "none this shift" : `${olet.count} this shift`}
        tone="text-primary"
        iconPosition="start"
        iconSize="size-4.25"
        iconStrokeWidth={1.75}
      />
      <p className="text-xs text-muted-foreground">
        Definition and columns pending client confirmation (FR-AN-06).
      </p>
    </CardContent>
  </Card>
);
