import { SWATCH_BY_TONE, type ChartTone } from "@/components/charts/tones";
import { cn } from "@/lib/utils";

/**
 * The series key that sits **above** every chart — the prototype's own legend
 * markup rather than Recharts'.
 *
 * ## Why not `ChartLegend` / `ChartLegendContent`
 *
 * Three things shadcn's legend cannot express, and all three are visible when
 * the two charts are put side by side:
 *
 * - **The marker is a different shape per chart.** `iLine` (app-source.txt 485)
 *   draws `width:15, height:3` — a short *line*, because the thing it labels is
 *   a line. `iStackBar` (532) draws `width:11, height:11` — a square, because
 *   the thing it labels is a block. `ChartLegendContent` hardcodes one 8×8
 *   square for both.
 * - **It paints the swatch with `style={{backgroundColor}}`**, which
 *   `eslint.config.mjs:56` bans in this repo. Reaching the colour through
 *   `SWATCH_BY_TONE` keeps it a token.
 * - **It lives inside the SVG's layout.** Recharts reserves plot height for a
 *   legend even at `verticalAlign="top"`, so the chart shrank to make room for a
 *   row of text. The prototype's legend is a plain `div` *before* the chart
 *   body, which is what this is.
 *
 * Deliberately not interactive. The prototype's is inert, and the pie's legend —
 * the one place a legend row does something — is a `<button>` list local to
 * `PieChart` for that reason.
 */

export interface ChartKeyEntry {
  name: string;
  tone: ChartTone;
}

interface ChartKeyProps {
  entries: readonly ChartKeyEntry[];
  /**
   * `line` for a line/area chart, `block` for bars and stacks — matching what
   * the mark actually looks like in the plot.
   */
  marker: "line" | "block";
  className?: string;
}

export const ChartKey = ({ entries, marker, className }: ChartKeyProps) => (
  /*
    `aria-hidden`, and that is not an omission. `ChartFrame` already exposes
    every series name as a column header in the accessible table, so announcing
    them again here would read the same five labels twice with no numbers
    attached — noise between the heading and the data.
  */
  <ul
    /*
      `data-slot`, matching how `ui/card` and the rest of the shadcn layer expose
      their parts. It is the only handle a test has: `aria-hidden` removes this
      list from the accessibility tree by design, so `getByRole("list")` cannot
      reach it, and locating a legend by its text alone would match the tooltip
      rows too.
    */
    data-slot="chart-key"
    className={cn("flex flex-wrap items-center gap-4", className)}
    aria-hidden
  >
    {entries.map((entry) => (
      <li
        key={entry.name}
        data-slot="chart-key-item"
        className="flex items-center gap-1.75 text-xs text-muted-foreground"
      >
        <span
          data-slot="chart-key-marker"
          className={cn(
            "shrink-0 rounded-xs",
            /*
              The prototype's geometry — 15×3 for a line, 11×11 for a block —
              expressed on the theme's spacing scale rather than as `w-[15px]`.
              Tailwind v4 computes these from `--spacing` (0.25rem), so
              `w-3.75` *is* 15px at the default root size and grows with a
              reader's text setting; `.claude/rules/01` bans the fixed-pixel
              form, and `charts.test.tsx` enforces it.
            */
            marker === "line" ? "h-0.75 w-3.75" : "size-2.75",
            SWATCH_BY_TONE[entry.tone]
          )}
        />
        {entry.name}
      </li>
    ))}
  </ul>
);
