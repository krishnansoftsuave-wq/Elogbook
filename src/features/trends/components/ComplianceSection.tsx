import {
  Archive,
  CalendarX,
  CircleAlert,
  Clock,
  HelpCircle,
} from "lucide-react";

import type { ChartTone } from "@/components/charts/tones";
import { HorizontalStackedBarChart } from "@/components/charts/HorizontalStackedBarChart";
import type {
  StackedBucket,
  StackedCategory,
} from "@/components/charts/StackedBarChart";
import { StatTile } from "@/components/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DUE_BUCKETS,
  DUE_BUCKET_LABEL,
  type ComplianceCategory,
  type DueBucket,
} from "@/features/trends/schemas";
import { cn } from "@/lib/utils";

/**
 * Compliance & Due-Date Status — the prototype's `dueSummary` + `dueSection`
 * (app-source.txt 1921–1928): four summary tiles above a 100%-stacked
 * horizontal bar per category (`iHStack`, already ported as
 * `HorizontalStackedBarChart`).
 *
 * **Bucket → chart tone.** The prototype's own `RAG()` (app-source.txt 546)
 * names an exact colour per bucket — `Overdue` red (`#C0392B`), `Due ≤ 7
 * days` amber (`#D97706`), `Due ≤ 30 days` **gold/yellow** (`#E0B000`,
 * distinct from the amber above it), `Due > 30 days` green (`#1E8E4E`),
 * `No date` **grey** (`#9BADA9`) — and `chart-1..7` had no yellow or grey
 * slot, which is what let `due_within_30_days` and `no_due_date` drift onto
 * blue and purple (`chart-6`/`chart-7`) instead. `chart-8`/`chart-9`
 * (`globals.css`) close that gap rather than approximating it with a hue the
 * ramp already had:
 *
 * | bucket               | RAG colour      | ChartTone |
 * |-----------------------|-----------------|-----------|
 * | overdue                | red (`#C0392B`) | chart-5   |
 * | due_within_7_days       | amber (`#D97706`)| chart-3  |
 * | due_within_30_days      | gold (`#E0B000`) | chart-8  |
 * | due_beyond_30_days      | green (`#1E8E4E`)| chart-4  |
 * | no_due_date             | grey (`#9BADA9`) | chart-9  |
 *
 * **Category → bar values, by name, not by array position.** The prototype
 * indexes its due-cats array positionally (`c.b[0]` is overdue); the wire
 * schema deliberately replaced that with a named `{bucket, count}[]` for
 * exactly the reason its own docblock gives — "a positional array on the wire
 * means a reordered `RAG()` silently relabels every count." Trusting the
 * response to already be in `DUE_BUCKETS` order would reintroduce the same
 * fragility one layer up, so each category's values are looked up by bucket
 * name here rather than read off `buckets[index]`.
 *
 * **Ranked by overdue count**, matching the prototype's own sort
 * (`cats=...slice().sort((a,b)=>(b.b[0]-a.b[0])||...)`, app-source.txt 1904):
 * highest-overdue category first, ties broken by total open items.
 *
 * **Tile icon → tile colour, and tile icon simplicity.** `trendTile`'s own
 * call (app-source.txt 1922-1925) colours each tile's icon (and its number)
 * to the tile's own meaning, not one shared tone: `Total open items` is
 * `C.tealDk` (`--brand-dark`), `Overdue` is destructive red, `Due ≤ 7 days` is
 * warning amber, `No due date` is muted. `Total open items` was rendering
 * `text-primary` instead of `text-brand-dark` — fixed here, since `StatTile`'s
 * `tone` prop drives both the icon and the number, one prop covers both.
 *
 * `Total open items`'s icon (`inventory`) was also `Boxes` — the same
 * twelve-path glyph `TrendsScreen.tsx`'s own comment documents as lucide's
 * busiest icon, and a second, independent instance of it besides the section
 * header's `inventory_2`. Replaced with `Archive` (3 primitives) — and
 * `TrendsScreen.tsx`'s "Equipment, Flare & Shipping" header now uses the same
 * `Archive`, on request: this tile's choice is the one to keep, so both
 * `inventory_2` and `inventory` render as the identical glyph rather than two
 * different simple ones.
 */

const DUE_BUCKET_CHART_TONE: Record<DueBucket, ChartTone> = {
  overdue: "chart-5",
  due_within_7_days: "chart-3",
  due_within_30_days: "chart-8",
  due_beyond_30_days: "chart-4",
  no_due_date: "chart-9",
};

const countOf = (category: ComplianceCategory, bucket: DueBucket): number =>
  category.buckets.find((entry) => entry.bucket === bucket)?.count ?? 0;

const totalOf = (category: ComplianceCategory): number =>
  category.buckets.reduce((sum, entry) => sum + entry.count, 0);

const sumAcross = (
  categories: readonly ComplianceCategory[],
  bucket: DueBucket
): number =>
  categories.reduce((sum, category) => sum + countOf(category, bucket), 0);

export interface ComplianceSectionProps {
  complianceCategories: readonly ComplianceCategory[];
  className?: string;
}

export const ComplianceSection = ({
  complianceCategories,
  className,
}: ComplianceSectionProps) => {
  const totalOpen = complianceCategories.reduce(
    (sum, category) => sum + totalOf(category),
    0
  );
  const overdue = sumAcross(complianceCategories, "overdue");
  const due7 = sumAcross(complianceCategories, "due_within_7_days");
  const noDate = sumAcross(complianceCategories, "no_due_date");

  const buckets: StackedBucket[] = DUE_BUCKETS.map((bucket) => ({
    name: DUE_BUCKET_LABEL[bucket],
    tone: DUE_BUCKET_CHART_TONE[bucket],
  }));

  const categories: StackedCategory[] = [...complianceCategories]
    .sort(
      (a, b) =>
        countOf(b, "overdue") - countOf(a, "overdue") || totalOf(b) - totalOf(a)
    )
    .map((category) => ({
      label: category.label,
      values: DUE_BUCKETS.map((bucket) => countOf(category, bucket)),
    }));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="group"
        aria-label="Compliance summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatTile
          label="Total open items"
          value={String(totalOpen)}
          icon={Archive}
          hint={`across ${complianceCategories.length} categories`}
          tone="text-brand-dark"
          iconPosition="start"
          iconSize="size-4.25"
          iconStrokeWidth={1.75}
        />
        <StatTile
          label="Overdue"
          value={String(overdue)}
          icon={CircleAlert}
          hint="past due date now"
          tone="text-destructive"
          iconPosition="start"
          iconSize="size-4.25"
          iconStrokeWidth={1.75}
        />
        <StatTile
          label="Due ≤ 7 days"
          value={String(due7)}
          icon={Clock}
          hint="need action this week"
          tone="text-warning"
          iconPosition="start"
          iconSize="size-4.25"
          iconStrokeWidth={1.75}
        />
        <StatTile
          label="No due date"
          value={String(noDate)}
          icon={HelpCircle}
          hint="unparsed — needs review"
          tone="text-muted-foreground"
          iconPosition="start"
          iconSize="size-4.25"
          iconStrokeWidth={1.75}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {/* `card()`'s own `tIcon:'event_busy'` (app-source.txt 1928) — the
                same glyph `secTitle('event_busy', 'Compliance & Due-Date
                Status')` uses, so it maps to the same lucide icon
                (`TrendsScreen.tsx`) rather than inventing a second
                translation of one Material glyph. This card's title was
                previously missing an icon entirely. */}
            <CalendarX className="size-4.25 text-primary" aria-hidden />
            Compliance Items — Due-Date Status by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <HorizontalStackedBarChart
            label="Compliance items — due-date status by category"
            buckets={buckets}
            categories={categories}
            categoryHeader="Category"
            totalSuffix="open"
          />
          {/* 11px in the prototype (dueSection, app-source.txt 1928) — an
              exact match for the theme's `text-2xs` — sitting 14px below the
              chart (`mt-3.5`). The margin is on the paragraph rather than a
              `gap` on the card, because the legend above the chart owns its
              own 14px and a shared gap would have to agree with both. */}
          <p className="mt-3.5 text-2xs text-muted-foreground">
            Ranked by overdue count. Each bar is 100% of that category&apos;s
            open items, segmented by due-date bucket. Categories:{" "}
            {/* Derived from the response, not the prototype's hardcoded
                "Active Force, Active AOF, ICC in DFT..." sentence
                (app-source.txt 1928) — FR-AN-06 leaves the category set "to
                be confirmed", so a literal string here would silently go
                stale the day an eighth category ships. Reads off
                `complianceCategories` (the wire order), not the chart's own
                overdue-sorted copy, so today's output matches the
                prototype's declared order exactly. */}
            {complianceCategories.map((category) => category.label).join(", ")}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
