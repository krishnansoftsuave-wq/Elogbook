import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  AuditTable,
  ExportAuditButton,
} from "@/features/audit/components/AuditTable";

export const metadata: Metadata = { title: "Audit log" };

/**
 * §7.11 — **FR-ADM-05**, **FR-OBS-01**, **§9.3**.
 *
 * Sixteen handlers have been writing to this trail since Phase 0a with nothing
 * on the other end to read it. Click through the product and come back here:
 * the log fills up, which is the demonstration this screen exists to give.
 *
 * Title and subtitle are the prototype's own, verbatim (`app-source.txt`
 * 1646: `pageHead('Audit Log','Immutable record of system and user
 * activity',...)`).
 */
export default function AdminAuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable record of system and user activity"
        actions={<ExportAuditButton />}
      />
      <AuditTable />
    </>
  );
}
