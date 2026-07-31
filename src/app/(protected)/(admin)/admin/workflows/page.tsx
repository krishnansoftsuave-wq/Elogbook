import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { WorkflowSettings } from "@/features/admin/components/WorkflowSettings";

export const metadata: Metadata = { title: "Workflows" };

/**
 * §7.10 / §6.4 / §6.5 — the four workflow switches.
 *
 * Gated on `access:control` by `ROUTE_PERMISSIONS.ADMIN_WORKFLOWS`, the first
 * entry in that table to override a broader one. Both admin-tree roles reach it;
 * which switches each may flip is decided per card by `WORKFLOW_PERMISSION`.
 */
export default function AdminWorkflowsPage() {
  return (
    <>
      <PageHeader
        title="Workflows"
        description="Turn optional capabilities on for Operators, Supervisors and Management. Every switch is off until somebody enables it, and a change takes effect immediately for everyone."
      />
      <WorkflowSettings />
    </>
  );
}
