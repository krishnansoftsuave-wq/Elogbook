import { BRAND_LETTER } from "@/constants/brand";
import { cn } from "@/lib/utils";

/**
 * Three sizes, one per place the prototype draws the mark. The prototype gives
 * each a pixel size, a corner radius and a type size; those triples are
 * transcribed here so a consumer picks a name instead of re-deriving numbers.
 *
 * | key | prototype                       | box  | radius | type |
 * | --- | ------------------------------- | ---- | ------ | ---- |
 * | sm  | signing-in bar (app-source 2262)| 28px | 6px    | 13px |
 * | md  | application top bar (193)       | 30px | 6px    | 14px |
 * | lg  | sign-in brand panel (2275)      | 60px | 12px   | 29px |
 *
 * Sizes are in rem so the mark scales with a user's browser text setting
 * (WCAG 1.4.4); the prototype's fixed px would not.
 */
const SIZES = {
  sm: "size-7 rounded-md text-[0.8125rem]",
  md: "size-[1.875rem] rounded-md text-sm",
  lg: "size-15 rounded-xl text-[1.8125rem]",
} as const;

export type BrandMarkSize = keyof typeof SIZES;

interface BrandMarkProps {
  size?: BrandMarkSize;
  /**
   * `onBrand` inverts the mark for the teal bar and the gradient panel: a white
   * tile with a teal letter, which is how the prototype draws it in all three
   * places. The default — a teal tile with a white letter — is for a light
   * surface, where an all-white tile would vanish.
   *
   * Both pairings use `--brand-surface` / `--on-brand`, which hold the same
   * value in light and dark, so the mark reads at 4.51:1 either way. Using
   * `--primary` here would flip it to the dark theme's brighter teal and drop
   * the letter on its white tile to 2.59:1.
   */
  onBrand?: boolean;
  className?: string;
}

/**
 * The product's logo placeholder, from the prototype: a rounded tile carrying a
 * heavy "L" (`app-source.txt` 193, 2262, 2275).
 *
 * Always `aria-hidden`. Every place it appears, the product name is stated in
 * adjacent text — announcing "L" as well would only add noise for a screen
 * reader. The one screen that renders the mark without an adjacent wordmark is
 * the sign-in brand panel, where the `<h1>` two lines below says the same thing.
 */
export const BrandMark = ({
  size = "md",
  onBrand = false,
  className,
}: BrandMarkProps) => (
  <span
    aria-hidden
    className={cn(
      "flex shrink-0 items-center justify-center font-extrabold",
      onBrand
        ? "bg-on-brand text-brand-surface"
        : "bg-brand-surface text-on-brand",
      SIZES[size],
      className
    )}
  >
    {BRAND_LETTER}
  </span>
);
