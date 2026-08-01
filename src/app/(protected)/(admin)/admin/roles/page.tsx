import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminTabs } from "@/features/admin/components/AdminTabs";
import { RolesTable } from "@/features/admin/components/RolesTable";

export const metadata: Metadata = { title: "Roles" };

/**
 * §6 / FR-ADM-02 — the base roles plus any Administrator-created custom
 * roles, each mapped to an AD group. Gated on the wildcard by
 * `ROUTE_PERMISSIONS.ADMIN_ROLES`.
 *
 * "New role" links to `ROUTES.ADMIN.ROLE_ADD`, the `roleFormScreen`
 * (`app-source.txt` 1613–1630) stub — the permissions-matrix/data-scope/AD-
 * mapping form itself is a separate, larger piece of work.
 */
export default function AdminRolesPage() {
  return (
    <>
      <PageHeader
        title="Roles"
        description="Base roles and Administrator-created custom roles, each mapped to an AD group."
        actions={
          <Link
            href={ROUTES.ADMIN.ROLE_ADD}
            className={buttonVariants({ variant: "default" })}
          >
            <Plus aria-hidden />
            New role
          </Link>
        }
      />
      <AdminTabs />
      <RolesTable />
    </>
  );
}
