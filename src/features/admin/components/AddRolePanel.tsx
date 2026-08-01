"use client";

import { useCreateRole } from "@/features/admin/api/mutations";
import { useRoles } from "@/features/admin/api/queries";
import { RoleForm } from "@/features/admin/components/RoleForm";

export const AddRolePanel = () => {
  const createRole = useCreateRole();
  const { data: roles } = useRoles();
  const existingAdGroups = roles?.map((role) => role.adGroup) ?? [];

  return (
    <RoleForm
      existingAdGroups={existingAdGroups}
      submitLabel="Save & activate"
      isSubmitting={createRole.isPending}
      onSubmit={(values) => createRole.mutate(values)}
    />
  );
};
