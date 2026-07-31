import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One number with a label — the "Shift KPIs" widget the prototype's own
 * `dashWidgets` declares for the operator dashboard (`app-source.txt` 112).
 *
 * It **composes** `ui/card.tsx` rather than being hand-authored as a
 * shadcn-shaped primitive, the same rule `StatusPill` follows for `Badge`.
 *
 * It lives in `features/home/` and not `src/components/` on purpose: the
 * promotion rule here is two consuming features, and today there is one.
 * Phase 4's management KPIs (FR-AN-02) is the expected second, and moving it
 * then is a rename, not a rewrite.
 *
 * `value` is a string rather than a number so a caller can pass "—" for "not
 * known yet" without this component having to invent a placeholder — and so a
 * future percentage or ratio needs no new prop.
 */

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Extra context under the number, e.g. "of 14 open". */
  hint?: string;
  /** Tailwind text-colour class for the icon and value, e.g. `text-destructive`. */
  tone?: string;
  isLoading?: boolean;
}

export const StatTile = ({
  label,
  value,
  icon: Icon,
  hint,
  tone,
  isLoading = false,
}: StatTileProps) => (
  <Card>
    <CardContent className="flex items-start justify-between gap-3 py-1">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone ?? "text-foreground"
            )}
          >
            {value}
          </p>
        )}
        {hint ? (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Icon
        className={cn("size-5 shrink-0", tone ?? "text-muted-foreground")}
        aria-hidden
      />
    </CardContent>
  </Card>
);
