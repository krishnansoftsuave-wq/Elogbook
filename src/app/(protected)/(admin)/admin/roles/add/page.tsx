import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AddRolePanel } from "@/features/admin/components/AddRolePanel";

export const metadata: Metadata = { title: "New custom role" };

/**
 * `roleFormScreen` (`app-source.txt` 1613–1630) — role name, a module
 * permissions matrix, a data-scope toggle and AD group mapping. §6 /
 * FR-ADM-02: "activate immediately" — there is no draft state here.
 */
export default function AdminRoleAddPage() {
  return (
    <>
      <PageHeader
        title="New custom role"
        description="Define permissions, data scope and AD mapping."
      />
      <AddRolePanel />
    </>
  );
}
