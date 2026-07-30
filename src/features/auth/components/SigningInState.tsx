import { BrandSpinner } from "@/components/layout/BrandSpinner";
import { AuthBarScreen } from "@/features/auth/components/AuthScreen";

interface SigningInStateProps {
  /** Overridable so each step of the chain can say what it is actually doing. */
  title?: string;
  detail?: string;
}

/**
 * The prototype's signing-in screen (`app-source.txt` 2259–2268): a teal bar
 * above a ring spinner, "Signing in…" and "Redirecting to your dashboard".
 *
 * The prototype reaches this state on a 1700 ms `setTimeout`; here it lasts
 * whatever the real work takes — the `/dev/token` exchange plus `GET /me`.
 *
 * Its own `<h1>`, because while it renders it is the whole screen.
 *
 * DEVIATION (WCAG 1.4.3): the prototype sets the second line in `C.mut2`
 * (#9BADA9), which measures 2.35:1 on white — well under the 4.5:1 AA minimum
 * that the testing standard marks [ENFORCED]. It uses
 * `--muted-foreground` (#5E726E, 5.11:1) instead. Same role in the hierarchy,
 * a legible weight of grey.
 */
export const SigningInState = ({
  title = "Signing in…",
  detail = "Redirecting to your dashboard",
}: SigningInStateProps) => (
  <AuthBarScreen>
    <div
      className="flex flex-col items-center gap-4.5 text-center"
      role="status"
      aria-live="polite"
    >
      <BrandSpinner />

      <h1 className="text-base font-semibold text-brand-dark">{title}</h1>

      <p className="text-[0.8125rem] text-muted-foreground">{detail}</p>
    </div>
  </AuthBarScreen>
);
