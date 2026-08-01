import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AuditTable } from "@/features/audit/components/AuditTable";

export const metadata: Metadata = { title: "Audit log" };

/**
 * §7.11 — **FR-ADM-05**, **FR-OBS-01**, **§9.3**.
 *
 * Sixteen handlers have been writing to this trail since Phase 0a with nothing
 * on the other end to read it. Click through the product and come back here:
 * the log fills up, which is the demonstration this screen exists to give.
 *
 * Title and subtitle are the prototype's own (`app-source.txt` 1646).
 */
export default function AdminAuditPage() {
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Immutable record of system and user activity. Entries are appended by the platform and can never be edited or removed."
      />
      <AuditTable />
    </>
  );
}
