import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 border-[3px]",
  lg: "size-12 border-4",
} as const;

interface BrandSpinnerProps {
  /** `lg` is the prototype's 48px signing-in ring; `sm` suits inline use. */
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * The prototype's loading indicator (`app-source.txt` 2265): a disc with a pale
 * `#E0EAE8` ring whose top edge is teal, rotating once every 0.8s.
 *
 * It is a bordered element rather than a `lucide-react` icon because that is
 * what the prototype draws, and because the ring reads as a determinate-looking
 * arc at 48px where `Loader2`'s stroke does not. `animate-spin` defaults to 1s;
 * `elspin` is 0.8s, so the duration is set explicitly.
 *
 * Always `aria-hidden` — every caller pairs it with a live region carrying the
 * text, and a spinning graphic has nothing to announce on its own.
 */
export const BrandSpinner = ({ size = "lg", className }: BrandSpinnerProps) => (
  <span
    aria-hidden
    className={cn(
      "animate-spin rounded-full border-brand-track border-t-primary [animation-duration:0.8s]",
      SIZES[size],
      className
    )}
  />
);
