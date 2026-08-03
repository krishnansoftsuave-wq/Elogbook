/**
 * The one tooltip appearance every chart uses.
 *
 * shadcn's `ChartTooltipContent` defaults to a light card — `bg-background`
 * with a hairline border. The prototype's is the opposite: a solid dark panel
 * with white text (`iBar` app-source.txt 461, `iLine` 493), which is the right
 * call on a dashboard of white cards. A pale tooltip over a pale card has to
 * lean on its shadow to separate, and on the plant-floor tablets **NFR-08**
 * targets — often glare-lit, often at an angle — that separation is the first
 * thing to disappear.
 *
 * Kept here rather than repeated at four call sites for the reason `Notice`
 * exists: a copied class string drifts, and a drifted tooltip is one that has
 * quietly stopped meeting the 4.5:1 contrast `.claude/rules/03` requires.
 *
 * The two descendant overrides are doing real work. `ChartTooltipContent`
 * paints series names with `text-muted-foreground`, which is tuned for a light
 * surface and becomes unreadable on a dark one; and it draws a border that a
 * solid panel does not need.
 */
export const CHART_TOOLTIP_CLASS = [
  "border-0 bg-foreground text-background shadow-lg",
  // Series names — muted against the dark panel rather than against the page.
  "[&_.text-muted-foreground]:text-background/70",
  /*
    The values. `ChartTooltipContent` paints them `text-foreground`, which on a
    `bg-foreground` panel is the same colour as the panel — the numbers were
    invisible, and a tooltip that lists five labels with no figures beside them
    looks like a rendering bug rather than a contrast one.
  */
  "[&_.text-foreground]:text-background",
].join(" ");

/**
 * The panel's own box, for a tooltip that does **not** go through
 * `ChartTooltipContent`.
 *
 * `LineChart` renders its rows itself — the prototype writes `name + ': ' +
 * value` as one run of text (`iLine` 494) rather than shadcn's name / right-
 * aligned-value grid, which collided at five series. What that lost was the
 * *box*: padding, radius and text size all live on `ChartTooltipContent`'s base
 * classes, so a bare `div` carrying only `CHART_TOOLTIP_CLASS` came out with
 * `padding: 0` and the longest row's last glyph flush against the edge.
 *
 * The values are the prototype's: `padding:'6px 9px'`, `borderRadius:6`,
 * `fontSize:10.5`, `whiteSpace:'nowrap'` — rounded onto the theme scale.
 */
export const CHART_TOOLTIP_PANEL_CLASS = [
  CHART_TOOLTIP_CLASS,
  "w-fit rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap",
].join(" ");

/**
 * `dot`, not `dashed`.
 *
 * The prototype's tooltip marks each row with a small filled square, which
 * reads as "this colour on the chart". shadcn's `dashed` indicator draws a
 * hollow dashed rule instead — a fine choice for a line chart's tooltip, and
 * the wrong one beside a stack of solid blocks, where the swatch is the only
 * thing tying the row to the segment it describes.
 */
export const CHART_TOOLTIP_INDICATOR = "dot" as const;
