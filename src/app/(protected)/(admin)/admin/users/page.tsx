import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AdminTabs } from "@/features/admin/components/AdminTabs";
import { UsersTable } from "@/features/users/components/UsersTable";
import {
  getterFromPageSearchParams,
  parseUserFilters,
} from "@/features/users/hooks/userFilterParams";

export const metadata: Metadata = { title: "Users" };

interface UsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * **FR-ADM-01**, as far as this platform can honestly go.
 *
 * There is no "Add user" action, and its absence is a decision rather than an
 * omission: **FR-AUTH-02** makes Active Directory the system of record, and an
 * account created here would carry no AD groups, so `resolveSession` could never
 * sign it in. The header says where accounts do come from, so the missing button
 * reads as the design instead of a gap.
 *
 * **Reads `searchParams` server-side rather than `UsersTable` calling
 * `useSearchParams()` client-side** — same pattern as `AdminAuditPage`: it
 * seeds a bookmarked or shared filtered URL correctly without putting the
 * Suspense-boundary requirement `useSearchParams()` carries onto this screen.
 */
export default async function UsersPage({
  searchParams,
}: Readonly<UsersPageProps>) {
  const initialFilters = parseUserFilters(
    getterFromPageSearchParams(await searchParams)
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone Active Directory has given access to this platform. Accounts are created and removed in AD; platform access is set here."
      />
      <AdminTabs />
      <UsersTable initialFilters={initialFilters} />
    </>
  );
}
