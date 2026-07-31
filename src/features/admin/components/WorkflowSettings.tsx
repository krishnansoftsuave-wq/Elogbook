"use client";

import { TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateWorkflow } from "@/features/admin/api/mutations";
import { useWorkflows } from "@/features/admin/api/queries";
import { WorkflowCard } from "@/features/admin/components/WorkflowCard";
import { WORKFLOW_KEYS, WORKFLOW_PERMISSION } from "@/features/admin/schemas";
import { useSession } from "@/features/auth/hooks/useSession";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * The four workflow switches — §6.4, "Enable or disable workflow for Supervisor
 * & Management", and §6.5, "Control access to comments and the decision
 * workflow".
 *
 * **Two owners, not one.** An Administrator may flip all four; a Super User may
 * flip the two the BRD names as theirs. `WORKFLOW_PERMISSION` is that map and
 * `PATCH /admin/workflows` enforces it.
 *
 * This screen is the reason Phases 1 and 2 can be demonstrated at all. Every
 * switch seeds **off**, which is what FR-PA-05 and §6.3(a) require of the
 * default, and until now nothing in the app could turn one on — so the owner
 * assignment, the action lifecycle and Operator commenting all existed
 * permanently in their "turned off" branch.
 */
export const WorkflowSettings = () => {
  const { permissions } = useSession();
  const { data, isLoading, isError } = useWorkflows();
  const updateWorkflow = useUpdateWorkflow();

  /*
    An error is not "no switches configured". Rendering an empty list here would
    tell an Administrator that the platform has no workflow controls, which is
    both false and the kind of claim that stops somebody looking further.
  */
  if (isError) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        The workflow settings could not be loaded, so the switches below cannot
        be shown or changed. Reload to try again.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {/* One placeholder per switch, derived rather than typed — a literal 4
            silently stops matching the moment a fifth key is added. */}
        {WORKFLOW_KEYS.map((key) => (
          <Skeleton key={`workflow-skeleton-${key}`} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const workflows = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.key}
          workflow={workflow}
          /*
            Per switch, not per screen. A Super User may control comments and
            the decision workflow (FR-ADM-06, FR-DASH-03) and may not touch
            action assignment (FR-PA-05, "the Administrator"), so two of these
            four cards are live for them and two are not. `PATCH` enforces the
            same map; this is the UI half of FR-ADM-03, never the enforcement.
          */
          canEdit={hasPermission(
            permissions,
            WORKFLOW_PERMISSION[workflow.key]
          )}
          // Only the card being written to is frozen. Disabling all four while
          // one request is in flight would make a slow network feel like a
          // broken screen.
          isPending={
            updateWorkflow.isPending &&
            updateWorkflow.variables?.key === workflow.key
          }
          onToggle={(enabled) =>
            updateWorkflow.mutate({ key: workflow.key, enabled })
          }
        />
      ))}
    </div>
  );
};
