"use client";

import { useCreateUser } from "@/features/users/api/mutations";
import { UserForm } from "@/features/users/components/UserForm";

export const AddUserPanel = () => {
  const createUser = useCreateUser();

  return (
    <UserForm
      submitLabel="Create user"
      isSubmitting={createUser.isPending}
      onSubmit={(values) => createUser.mutate(values)}
    />
  );
};
