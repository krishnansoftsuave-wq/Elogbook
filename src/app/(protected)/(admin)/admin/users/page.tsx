import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { UsersTable } from "@/features/users/components/UsersTable";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with access to this logbook."
        actions={
          // A link styled as a button — see the note in `logbook/page.tsx`.
          // Base UI's `Button` would stamp `role="button"` over the anchor's
          // implicit `link` role, and this navigates.
          <Link href={ROUTES.ADMIN.USER_ADD} className={buttonVariants()}>
            <Plus aria-hidden />
            Add user
          </Link>
        }
      />
      <UsersTable />
    </>
  );
}
