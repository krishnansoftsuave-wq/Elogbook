import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { UsersTable } from "@/features/users/components/UsersTable";

export const metadata: Metadata = { title: "Users" };

/**
 * **FR-ADM-01**, as far as this platform can honestly go.
 *
 * There is no "Add user" action, and its absence is a decision rather than an
 * omission: **FR-AUTH-02** makes Active Directory the system of record, and an
 * account created here would carry no AD groups, so `resolveSession` could never
 * sign it in. The header says where accounts do come from, so the missing button
 * reads as the design instead of a gap.
 */
export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone Active Directory has given access to this platform. Accounts are created and removed in AD; platform access is set here."
      />
      <UsersTable />
    </>
  );
}
