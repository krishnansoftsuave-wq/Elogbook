"use client";

import { Lock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateActionStatus } from "@/features/actions/api/mutations";
import { actionStatusUpdateSchema } from "@/features/actions/schemas";
import { useIsWorkflowEnabled } from "@/features/admin/api/queries";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";
import {
  ACTION_STATUS_LABEL,
  ACTION_STATUS_VALUES,
  type ActionStatus,
} from "@/types/operations";

/**
 * Moves an action through **FR-PA-04**'s six states.
 *
 * **The gate is the point of this component.** FR-PA-05: assignment, tracking,
 * update and closure are available *"only when the Administrator enables the
 * workflow"*, and §6.2(a) — the labelled default — is explicit that without it
 * *"no task is assigned to operators and there is no escalation step"*. So with
 * `supervisor_action_workflow` off, which is how it seeds, this renders a
 * disabled explanation rather than a control.
 *
 * Two independent conditions, because they answer different questions:
 * `action:write` asks *may this person change a status at all*, the toggle asks
 * *is the capability switched on*. Both must hold. The API enforces the same
 * pair — this is the UI half of FR-ADM-03, and it never replaces the server's.
 */

interface ActionStatusControlProps {
  actionId: string;
  status: ActionStatus;
}

const parseStatus = (value: unknown): ActionStatus | null => {
  const result = actionStatusUpdateSchema.shape.status.safeParse(value);
  return result.success ? result.data : null;
};

export const ActionStatusControl = ({
  actionId,
  status,
}: ActionStatusControlProps) => {
  const { permissions } = useSession();
  const workflowEnabled = useIsWorkflowEnabled("supervisor_action_workflow");
  const updateStatus = useUpdateActionStatus(actionId);

  const mayWrite = hasPermission(permissions, "action:write");

  if (!mayWrite || !workflowEnabled) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" aria-hidden />
        {mayWrite
          ? // The BRD's own default, stated as a fact about configuration
            // rather than as a failure.
            "Action tracking is turned off by your administrator. Confirmed actions are recorded in the shift summary instead."
          : "You have view-only access to this action."}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="action-status" className="text-sm text-muted-foreground">
        Status
      </label>
      <Select
        value={status}
        disabled={updateStatus.isPending}
        onValueChange={(value) => {
          const next = parseStatus(value);
          if (next && next !== status) updateStatus.mutate({ status: next });
        }}
      >
        <SelectTrigger
          id="action-status"
          className="w-[170px]"
          aria-label="Change action status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {ACTION_STATUS_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
