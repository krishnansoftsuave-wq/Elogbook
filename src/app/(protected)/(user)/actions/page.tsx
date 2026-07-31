import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { ActionsTable } from "@/features/actions/components/ActionsTable";

export const metadata: Metadata = { title: "Pending actions" };

/**
 * §7.6 — the pending-actions list. The prototype's `pending` screen
 * (`app-source.txt` 1189–1247).
 *
 * The subtitle is the Operator's, per the prototype's own role split at 1244:
 * a Supervisor's copy differs, and 1b/Phase 2 will branch it on permission
 * rather than on a role name.
 */
export default function ActionsPage() {
  return (
    <>
      <PageHeader
        title="Pending actions"
        description="Actions raised on this shift, across the whole plant."
      />
      <ActionsTable />
    </>
  );
}
