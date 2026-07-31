import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, type Priority } from "@/types/operations";

/**
 * The prototype's `priDot` (app-source.txt 166) — a coloured dot beside the
 * priority name.
 *
 * **The dot is decorative; the label carries the meaning.** Colour is redundant
 * rather than load-bearing, which is what satisfies WCAG 1.4.1 (use of colour),
 * and the dot is `aria-hidden` because announcing it would add noise without
 * adding information.
 *
 * A correction worth recording, because the first version of this comment had it
 * backwards: **`sr-only` does not satisfy 1.4.1.** That criterion is about
 * *sighted* users — an invisible label helps assistive technology (1.1.1,
 * 1.3.1) and does nothing for someone reading the screen. So `hideLabel` is not
 * an accessibility-neutral option: with it, hue is the only visual difference
 * between four identically-shaped dots. See its own note below.
 *
 * The dot is never text, so WCAG **1.4.11**'s 3:1 non-text bar applies rather
 * than 4.5:1. All four tones clear it on `--background`, the darkest light
 * surface they land on — ratios are recorded beside each token in `globals.css`.
 *
 * `--priority-high` and `--priority-medium` are their own tokens rather than
 * chart-ramp reuse. Medium never had a slot (`--chart-3/4/5` carry High, Low and
 * Critical). High needed one because `--chart-3` measured **2.82:1** as a dot on
 * `--background` and failed 1.4.11 — a chart series and a status dot have
 * different jobs and different thresholds, and sharing one token hid that.
 */

const DOT_BY_PRIORITY: Record<Priority, string> = {
  critical: "bg-destructive",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-chart-4",
};

interface PriorityDotProps {
  priority: Priority;
  /**
   * Drops the label to a screen-reader-only span.
   *
   * **Only safe where the surrounding context already names the priority** — a
   * table column headed "Priority", for instance. Used standalone it leaves hue
   * as the sole visual signal, which fails WCAG 1.4.1 for a sighted user with a
   * colour-vision deficiency. Default is off for that reason.
   */
  hideLabel?: boolean;
  className?: string;
}

export const PriorityDot = ({
  priority,
  hideLabel = false,
  className,
}: PriorityDotProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 whitespace-nowrap",
      className
    )}
  >
    <span
      className={cn("size-2 shrink-0 rounded-full", DOT_BY_PRIORITY[priority])}
      aria-hidden
    />
    {/*
      `sr-only` rather than omitted when the label is hidden: a bare dot conveys
      priority by colour alone, which fails WCAG 1.4.1 outright.
    */}
    <span className={cn(hideLabel && "sr-only")}>
      {PRIORITY_LABEL[priority]}
    </span>
  </span>
);
