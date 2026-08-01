import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  AuditTable,
  ExportAuditButton,
} from "@/features/audit/components/AuditTable";
import {
  getterFromPageSearchParams,
  parseAuditFilters,
} from "@/features/audit/hooks/auditFilterParams";

export const metadata: Metadata = { title: "Audit log" };

interface AdminAuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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
 *
 * **Reads `searchParams` server-side rather than `AuditTable` calling
 * `useSearchParams()` client-side** — same reason `auth/login/page.tsx` reads
 * `returnTo` that way: it seeds a bookmarked or shared filtered URL correctly
 * without putting the Suspense-boundary requirement `useSearchParams()`
 * carries onto this screen.
 */
export default async function AdminAuditPage({
  searchParams,
}: Readonly<AdminAuditPageProps>) {
  const initialFilters = parseAuditFilters(
    getterFromPageSearchParams(await searchParams)
  );

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable record of system and user activity"
        actions={<ExportAuditButton />}
      />
      <AuditTable initialFilters={initialFilters} />
    </>
  );
}
