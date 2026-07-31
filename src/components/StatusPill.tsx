import { Badge } from "@/components/ui/badge";
import type { DecisionStatus } from "@/features/decisions/schemas";
import type { RequestStatus } from "@/features/requests/schemas";
import { cn } from "@/lib/utils";
import { ACTION_STATUS_LABEL, type ActionStatus } from "@/types/operations";
import { DECISION_STATUS_LABEL } from "@/features/decisions/schemas";
import { REQUEST_STATUS_LABEL } from "@/features/requests/schemas";

/**
 * The prototype's `statusPill` (app-source.txt 167–171), generalised.
 *
 * It **composes** `components/ui/badge.tsx` rather than adding variants to it:
 * `Badge` is generated shadcn and `AGENTS.md` says not to hand-author those.
 * `EntryStatusBadge.tsx` is the existing precedent for the shape — a status →
 * label + appearance map — and this is the same idea widened across the three
 * Phase 0a vocabularies.
 *
 * **Why not the built-in variants.** `Badge` ships `default | secondary |
 * destructive | outline | ghost | link`. The prototype's pill needs amber (On
 * Hold, Pending Closure, In Review), blue (In Progress) and green (Verified,
 * Resolved) as well, and none of the six carries them. So the tone classes below
 * use the semantic tokens added to `globals.css` for this — each measured at
 * ≥ 4.5:1 as text over its own 10% tint, in both themes, with the ratios
 * recorded beside the token.
 *
 * The `bg-<tone>/10 text-<tone>` shape is not invented either: it is exactly
 * what `badge.tsx:16` already does for `destructive`.
 */

const TONE_CLASS = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-accent text-accent-foreground",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
} as const;

type Tone = keyof typeof TONE_CLASS;

/**
 * FR-PA-04's six states. `Overdue` is deliberately absent — it is a derived
 * flag (FR-PA-06), rendered by `OverdueFlag` *alongside* the status rather than
 * instead of it. See `isActionOverdue` in `types/operations.ts`.
 */
const ACTION_TONE: Record<ActionStatus, Tone> = {
  open: "brand",
  in_progress: "info",
  on_hold: "warning",
  completed: "neutral",
  cancelled: "neutral",
  verified: "success",
};

const DECISION_TONE: Record<DecisionStatus, Tone> = {
  in_progress: "info",
  pending_closure: "warning",
  completed: "neutral",
};

const REQUEST_TONE: Record<RequestStatus, Tone> = {
  in_review: "info",
  resolved: "neutral",
  rejected: "danger",
};

/**
 * A discriminated union rather than a bare string, so a decision status can
 * never be handed to the action map and silently fall through to a default.
 * The prototype's single lookup table keyed by display string does exactly
 * that: `m[s] || ['#5E726E','#ECEFEE']`.
 */
export type StatusPillProps =
  | { kind: "action"; status: ActionStatus; className?: string }
  | { kind: "decision"; status: DecisionStatus; className?: string }
  | { kind: "request"; status: RequestStatus; className?: string };

const resolve = (props: StatusPillProps): { label: string; tone: Tone } => {
  switch (props.kind) {
    case "action":
      return {
        label: ACTION_STATUS_LABEL[props.status],
        tone: ACTION_TONE[props.status],
      };
    case "decision":
      return {
        label: DECISION_STATUS_LABEL[props.status],
        tone: DECISION_TONE[props.status],
      };
    case "request":
      return {
        label: REQUEST_STATUS_LABEL[props.status],
        tone: REQUEST_TONE[props.status],
      };
  }
};

export const StatusPill = (props: StatusPillProps) => {
  const { label, tone } = resolve(props);

  return (
    <Badge className={cn("px-2.5", TONE_CLASS[tone], props.className)}>
      {label}
    </Badge>
  );
};
