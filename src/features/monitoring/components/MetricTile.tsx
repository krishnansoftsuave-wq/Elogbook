import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One headline figure — the prototype's `monTile` (app-source.txt 374–377), and
 * the identical shape its dashboard KPI tiles use (`widgetBody` case `'kpi'`,
 * 306–309): a small uppercase label, a large coloured number, a caption.
 *
 * `tone` accepts only the semantic states, not a colour. The prototype passes a
 * hex per tile (`'#1E8E4E'` for online users, `'#C0392B'` for failures), which
 * cannot follow dark mode and would fail the colour rule in `.claude/rules/01`.
 * More usefully, naming the state rather than the colour means a tile that is
 * "bad" says so in one place instead of every call site choosing a red.
 *
 * ⚠️ **This now has two consuming features** — `monitoring` and `home`, since
 * `ShiftKpis` replaced its own near-identical `StatTile` with it rather than
 * keeping two tile components that differed only by an icon the prototype does
 * not draw. By the promotion rule `StatTile` itself recorded, that makes it a
 * candidate for `src/components/`; it is left here because moving it is a rename
 * across every monitoring call site and buys nothing today. Worth doing when a
 * third feature needs it.
 */

type Tone = "default" | "brand" | "success" | "critical";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-foreground",
  brand: "text-primary",
  success: "text-success",
  critical: "text-destructive",
};

interface MetricTileProps {
  label: string;
  value: string;
  /** The small line beneath — units, window, or what the number counts. */
  caption?: string;
  tone?: Tone;
  /**
   * Replaces the number with a placeholder of the same height, so a card does
   * not resize when its figures land. Monitoring does not need it — that screen
   * holds back the whole body until `data` exists — but the dashboard's KPI
   * strip renders through its own load.
   */
  isLoading?: boolean;
  className?: string;
}

export const MetricTile = ({
  label,
  value,
  caption,
  tone = "default",
  isLoading = false,
  className,
}: MetricTileProps) => (
  <div
    className={cn(
      "rounded-lg border border-border-subtle bg-card p-4",
      className
    )}
  >
    <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
      {label}
    </p>
    {isLoading ? (
      <Skeleton className="mt-2 h-6 w-12" />
    ) : (
      <p
        className={cn(
          "mt-2 text-2xl leading-none font-bold tabular-nums",
          VALUE_TONE[tone]
        )}
      >
        {value}
      </p>
    )}
    {caption ? (
      <p className="mt-1.5 text-2xs text-muted-foreground">{caption}</p>
    ) : null}
  </div>
);
