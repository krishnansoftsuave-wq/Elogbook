import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { isActionOverdue, type ActionStatus } from "@/types/operations";

/**
 * **FR-PA-06**, in full: *"Flag overdue actions **and alert the owner when the
 * action-tracking workflow is enabled** (no separate escalation step)."*
 *
 * ⚠️ The condition is quoted whole on purpose. An earlier version cited only the
 * first three words, which hid a genuine ambiguity: FR-PA-05 gates *"assignment,
 * **tracking**, update and closure"* on the Administrator toggle, and overdue
 * flagging is plausibly inside "tracking". So it is unresolved whether the
 * **flag** is gated or only the **alert**. This atom renders unconditionally and
 * takes no position — the caller owes the gate if the owner rules that way. Do
 * not resolve BRD ambiguity in a component comment.
 *
 * A separate component from `StatusPill` because overdue is a separate *kind of
 * thing*. FR-PA-04 fixes six lifecycle states and overdue is not among them;
 * FR-PA-06 asks for a flag, which is a property of a due date and a status
 * together. The prototype models it as a sixth status (`app-source.txt` 41),
 * which makes an action stop being "open" the moment its due date passes and
 * leaves no way back — so it renders *alongside* the status here, never instead
 * of it.
 *
 * Colour is not the only signal: the icon and the word "Overdue" both carry it
 * (WCAG 1.4.1). The icon is `aria-hidden` because the adjacent text already
 * names the state.
 */

interface OverdueFlagProps {
  dueAt: string;
  status: ActionStatus;
  /**
   * The instant to judge against. **Required, deliberately.**
   *
   * It started optional, defaulting to `new Date()` inside `isActionOverdue`.
   * That is a hydration hazard in a component with no `'use client'`: a server
   * render at 11:59:58 against a 12:00:00 due date returns `null`, the client
   * hydrates two seconds later and returns the flag, and React reports a
   * mismatch — or worse, silently keeps the server's answer. Any server/client
   * clock skew does the same.
   *
   * Making it required pushes the decision to the caller, who can evaluate a
   * whole table against one instant — which is also more correct than each row
   * reading its own clock. `useNow()` is what callers should hand it.
   *
   * `null` means "the clock is not known yet" (pre-mount), and renders nothing.
   * That is the honest answer: on the server there is no user-relative now.
   */
  at: Date | null;
  className?: string;
}

export const OverdueFlag = ({
  dueAt,
  status,
  at,
  className,
}: OverdueFlagProps) => {
  if (!at || !isActionOverdue(dueAt, status, at)) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-destructive",
        className
      )}
    >
      <TriangleAlert className="size-3.5" aria-hidden />
      Overdue
    </span>
  );
};
