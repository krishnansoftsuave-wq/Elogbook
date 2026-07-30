"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateUser } from "@/features/users/api/mutations";
import { useUser } from "@/features/users/api/queries";
import { UserForm } from "@/features/users/components/UserForm";

interface EditUserPanelProps {
  userId: string;
}

export const EditUserPanel = ({ userId }: EditUserPanelProps) => {
  const { data: user, isLoading, isError } = useUser(userId);
  const updateUser = useUpdateUser(userId);

  if (isLoading) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  // The failure itself was already toasted by QueryCache.onError.
  if (isError || !user) {
    return (
      <p className="text-sm text-muted-foreground">
        This user could not be loaded.
      </p>
    );
  }

  return (
    <UserForm
      // Remount once the record arrives so RHF picks up the loaded values.
      key={user.id}
      defaultValues={{
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      }}
      submitLabel="Save changes"
      isSubmitting={updateUser.isPending}
      onSubmit={(values) => updateUser.mutate(values)}
    />
  );
};
