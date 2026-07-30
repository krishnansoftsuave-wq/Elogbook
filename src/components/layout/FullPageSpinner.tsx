import { BrandSpinner } from "@/components/layout/BrandSpinner";

interface FullPageSpinnerProps {
  label?: string;
}

/**
 * The waiting state for a whole route — the root redirect and `RoleGuard` while
 * they resolve a session.
 *
 * It uses the prototype's ring rather than a `Loader2` because it renders
 * immediately after `SigningInState` in the sign-in chain: the callback shows
 * the ring, hands off to `/`, and `/` shows this. Two different spinners across
 * that handoff read as two different loads.
 */
export const FullPageSpinner = ({
  label = "Loading…",
}: FullPageSpinnerProps) => (
  <div
    className="flex flex-1 flex-col items-center justify-center gap-3 p-8"
    role="status"
    aria-live="polite"
  >
    <BrandSpinner size="sm" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);
