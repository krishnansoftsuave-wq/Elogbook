"use client";

import { Lock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignActionOwner } from "@/features/actions/api/mutations";
import { useAssignableOwners } from "@/features/actions/api/queries";
import { useIsWorkflowEnabled } from "@/features/admin/api/queries";
import { useSession } from "@/features/auth/hooks/useSession";
import type { Actor } from "@/types/actor";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * Records who owns an action — **FR-PA-03**, gated by **FR-PA-05**.
 *
 * **The gate is the point, exactly as it is for `ActionStatusControl`.**
 * FR-PA-05: assignment is available *"only when the Administrator enables the
 * workflow; supervisors do not assign tasks to operators by default"*. §6.2(a),
 * the subsection the BRD itself labels "the default", says the flow *"stops at
 * review and confirmation"*. So with `supervisor_action_workflow` off — how it
 * seeds — this renders an explanation, not a disabled dropdown, because the
 * capability is switched off rather than momentarily unavailable.
 *
 * Two independent conditions: `action:assign` asks *may this person assign*, the
 * toggle asks *is assignment turned on at all*. `PUT /actions/:id/owner`
 * enforces the same pair server-side; this is the UI half of FR-ADM-03 and never
 * replaces it.
 *
 * **Not on the list screen.** The prototype puts an Owner column and a per-row
 * assign dropdown in the pending table (`app-source.txt` 1218, 1248–1259). One
 * detail screen with one control is the same capability without a table cell
 * that opens a popup over the row below it — and the list already shows the
 * owner, read-only, for scanning.
 */

interface ActionOwnerControlProps {
  actionId: string;
  owner: Actor | null;
}

/** Distinguishes "nobody" from a username, since a Select value must be a string. */
const UNASSIGNED = "__unassigned__";

export const ActionOwnerControl = ({
  actionId,
  owner,
}: ActionOwnerControlProps) => {
  const { permissions } = useSession();
  const workflowEnabled = useIsWorkflowEnabled("supervisor_action_workflow");
  const mayAssign = hasPermission(permissions, "action:assign");

  const canUse = mayAssign && workflowEnabled;
  const { data: people } = useAssignableOwners(canUse);
  const assign = useAssignActionOwner(actionId);

  if (!canUse) {
    return (
      <p className="inline-flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        {mayAssign
          ? // The BRD's own default, stated as configuration rather than failure.
            "Assignment is turned off by your administrator. Confirmed actions are recorded in the shift summary instead."
          : owner
            ? `Owned by ${owner.displayName}.`
            : "This action has no owner."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor="action-owner" className="text-sm text-muted-foreground">
          Owner
        </label>
        <Select
          value={owner?.username ?? UNASSIGNED}
          disabled={assign.isPending}
          onValueChange={(value) => {
            const next = value === UNASSIGNED ? null : String(value);
            if (next !== (owner?.username ?? null)) {
              assign.mutate({ owner_username: next });
            }
          }}
        >
          <SelectTrigger
            id="action-owner"
            className="w-full min-w-[11rem] sm:w-[14rem]"
            aria-label="Assign an owner"
            aria-describedby="action-owner-scope"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* Unassigning is contracted (`owner_username: null`), not a gap. */}
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {(people ?? []).map((person) => (
              <SelectItem key={person.username} value={person.username}>
                {person.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/*
        The list is people already working the plant's actions, not the user
        directory — there is no assignable-users endpoint in this build. Saying
        so matters: a Supervisor looking for the incoming shift's operator, who
        has never created or owned an action, would otherwise conclude the person
        does not exist rather than that the list is partial. The same component's
        workflow-off branch discloses its state; this one should too.
      */}
      <p id="action-owner-scope" className="text-2xs text-muted-foreground">
        Lists people already recorded on an action. A full directory needs the
        user-management API.
      </p>
    </div>
  );
};
