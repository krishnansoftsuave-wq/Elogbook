"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateRole } from "@/features/admin/api/mutations";
import { useRole, useRoles } from "@/features/admin/api/queries";
import { RoleForm } from "@/features/admin/components/RoleForm";

interface EditRolePanelProps {
  roleId: string;
}

export const EditRolePanel = ({ roleId }: EditRolePanelProps) => {
  const { data: role, isLoading, isError } = useRole(roleId);
  const { data: roles } = useRoles();
  const updateRole = useUpdateRole(roleId);
  const existingAdGroups = roles?.map((candidate) => candidate.adGroup) ?? [];

  if (isLoading) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  // The failure itself was already toasted by QueryCache.onError.
  if (isError || !role) {
    return (
      <p className="text-sm text-muted-foreground">
        This role could not be loaded.
      </p>
    );
  }

  // FR-AUTH-02: only a base role's AD group mapping is AD's access model, not
  // something this form can rewrite — name, permissions and data scope are
  // not part of that mapping and stay editable. `RoleForm` locks the AD group
  // field for a base role; the mock API pins `ad_group` server-side too.
  return (
    <RoleForm
      // Remount once the record arrives so RHF picks up the loaded values.
      key={role.id}
      defaultValues={{
        name: role.name,
        permissions: role.permissions,
        dataScope: role.dataScope,
        adGroup: role.adGroup,
      }}
      existingAdGroups={existingAdGroups}
      submitLabel="Save changes"
      isSubmitting={updateRole.isPending}
      adGroupLocked={role.type === "base"}
      onSubmit={(values) => updateRole.mutate(values)}
    />
  );
};
