"use client";

import { Gavel, Lightbulb, Lock, MessagesSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { roleLabel } from "@/constants/roles";
import {
  WORKFLOW_LABEL,
  type Workflow,
  type WorkflowKey,
} from "@/features/admin/schemas";

interface WorkflowCopy {
  icon: LucideIcon;
  /** Prototype copy, verbatim (`app-source.txt` 2003–2006). */
  whenEnabled: string;
  whenDisabled: string;
  /**
   * What flipping it changes **in this build**, stated only where that is less
   * than the copy above promises. Absent means the switch is fully wired.
   */
  reach?: string;
}

/**
 * The four cards' copy, taken from the prototype rather than rewritten. It is
 * unusually good product writing: each card says who is affected and what
 * changes on each side of the switch, which is exactly what an Administrator
 * needs before flipping something that alters five other screens.
 *
 * `Record<WorkflowKey, …>` on purpose — a fifth switch added to `WORKFLOW_KEYS`
 * will not compile until somebody writes its copy, which is the right place for
 * that decision to surface.
 */
const WORKFLOW_COPY: Record<WorkflowKey, WorkflowCopy> = {
  operator_comment_permission: {
    icon: MessagesSquare,
    whenEnabled:
      "operators can add comments on shift summaries and on pending actions — their notes appear in the discussion thread alongside supervisors and management. Operators still cannot approve, reject, or assign anything.",
    whenDisabled:
      "operators have read-only access to comment threads — they can view every comment but cannot add their own.",
  },
  supervisor_action_workflow: {
    icon: Users,
    whenEnabled:
      "supervisors can assign AI-suggested pending actions to operators — setting owner, priority, and due date. Actions move through the full lifecycle (Open → In Progress → On Hold → Completed → Cancelled → Verified) with overdue alerts.",
    whenDisabled:
      "supervisors review AI-suggested actions and confirm only whether each is included as a comment in the summary report. No task is created and no operator is assigned.",
  },
  management_decision_workflow: {
    icon: Gavel,
    whenEnabled:
      "when management records a risk decision, a full notification workflow is triggered — tagging the relevant person, creating a logged action, and sending an in-app and email notification.",
    whenDisabled:
      "management records decisions for future reference only. The decision is stored in the platform audit log, but no notification or task is triggered.",
    reach:
      "The decisions API already enforces this switch. The Management screens that would show the difference are not built yet.",
  },
  predictive_insights: {
    icon: Lightbulb,
    whenEnabled:
      "AI-generated predictive insight widgets appear on the Management dashboard, surfacing early-warning patterns from historical data. Phase-1 availability depends on sufficient historical data and agreed metric definitions.",
    whenDisabled: "predictive widgets are hidden from all dashboards.",
    reach:
      "Nothing reads this switch yet, and no requirement asks for it — it comes from the prototype. FR-AN-04 wants predictive insight but says nothing about an Administrator toggle. Awaiting owner confirmation.",
  },
};

interface WorkflowCardProps {
  workflow: Workflow;
  /**
   * Whether **this session may flip this switch** — see `WORKFLOW_PERMISSION`.
   * Two of the four are a Super User capability and two are Administrator-only,
   * so this is per card rather than per screen.
   */
  canEdit: boolean;
  isPending: boolean;
  onToggle: (enabled: boolean) => void;
}

/**
 * One workflow switch — §6.4 / §6.5.
 *
 * A switch this session may not flip is shown **disabled and explained**, not
 * hidden. Seeing that comment access is on is useful to a Super User even when
 * the switch beside it is not theirs, and an inert control with no reason beside
 * it reads as a broken screen — the same lesson `ActionOwnerControl` records.
 *
 * **Deviation from the prototype:** its card prints "Click to enable" beneath
 * the toggle. That is dropped. It duplicates what a `role="switch"` already
 * announces, and it names the wrong gesture for the plant-floor tablets NFR-08
 * requires. The visible Enabled / Disabled word stays, because that is the
 * status rather than the instruction.
 */
export const WorkflowCard = ({
  workflow,
  canEdit,
  isPending,
  onToggle,
}: WorkflowCardProps) => {
  const copy = WORKFLOW_COPY[workflow.key];
  const Icon = copy.icon;
  const label = WORKFLOW_LABEL[workflow.key];

  return (
    <article className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div className="flex-1">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
            <Icon className="size-5 text-primary" aria-hidden />
            {label}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              When enabled:{" "}
            </strong>
            {copy.whenEnabled}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">
              When disabled (default):{" "}
            </strong>
            {copy.whenDisabled}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 max-sm:flex-row max-sm:items-center">
          <span
            className={
              workflow.enabled
                ? "text-sm font-semibold"
                : "text-sm font-semibold text-muted-foreground"
            }
          >
            {workflow.enabled ? "Enabled" : "Disabled"}
          </span>
          {/*
            Base UI renders this as a `<span role="switch">`, not a `<button>` —
            so `disabled` becomes `aria-disabled="true"` plus `tabindex="-1"`,
            never the native attribute. Worth knowing before writing an
            assertion or a `:disabled` style against it.
          */}
          <Switch
            // The card's heading is the switch's name; without this the control
            // announces as an unlabelled toggle in a page of four identical ones.
            aria-label={label}
            checked={workflow.enabled}
            disabled={!canEdit || isPending}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {/* Read off `affects_role`, not hardcoded beside the copy — the server
            owns which role a switch changes. */}
        <Badge variant="secondary">
          Affects: {roleLabel(workflow.affectsRole)} role
        </Badge>
        <Badge variant="outline">Default: OFF</Badge>
      </div>

      {canEdit ? null : (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Only an Administrator can change this one.
        </p>
      )}

      {copy.reach ? (
        <p className="mt-3 text-xs text-muted-foreground">{copy.reach}</p>
      ) : null}
    </article>
  );
};
