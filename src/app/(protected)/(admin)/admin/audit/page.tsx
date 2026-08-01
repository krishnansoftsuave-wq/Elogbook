import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  AuditTable,
  ExportAuditButton,
} from "@/features/audit/components/AuditTable";

export const metadata: Metadata = { title: "Audit log" };

// §7.11 (FR-ADM-05, FR-OBS-01, §9.3) — sixteen handlers write to this trail; this is the only screen that reads it.
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
