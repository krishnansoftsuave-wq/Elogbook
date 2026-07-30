import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AddUserPanel } from "@/features/users/components/AddUserPanel";

export const metadata: Metadata = { title: "Add user" };

export default function AddUserPage() {
  return (
    <>
      <PageHeader
        title="Add user"
        description="They receive an invitation as soon as the account is created."
      />
      <AddUserPanel />
    </>
  );
}
