/**
 * Percentage → Tailwind width class, in 5% steps.
 *
 * `eslint.config.mjs:56` bans the `style` attribute, so a continuous percentage
 * cannot become a width directly. Written out in full because Tailwind scans
 * source text — an interpolated `` `w-[${pct}%]` `` is a class it never sees and
 * therefore never generates.
 *
 * Extracted from `UsageBar`, which owned this table privately until a second
 * meter needed it. It is deliberately *only* the geometry: the fill colour is a
 * semantic decision each meter makes for itself, and sharing that too is how a
 * compliance bar ends up painted red for being 96%.
 */

const WIDTH_BY_STEP: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

/** Nearest 5%, clamped — the domain of `WIDTH_BY_STEP`. */
const toStep = (percent: number): number => {
  if (!Number.isFinite(percent)) return 0;
  const bounded = Math.max(0, Math.min(100, percent));
  return Math.round(bounded / 5) * 5;
};

/**
 * Five points of precision costs nothing on a bar whose exact value is printed
 * beside it, which every caller here does.
 */
export const percentWidthClass = (percent: number): string =>
  WIDTH_BY_STEP[toStep(percent)] ?? "w-0";
