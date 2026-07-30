"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { userKeys } from "@/features/users/api/keys";
import { userDetailSchema } from "@/features/users/schemas";
import type { UserFormValues } from "@/features/users/types";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

export const useCreateUser = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await api.post(API_ENDPOINTS.USERS.CREATE, values);
      return userDetailSchema.parse(response.data);
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`${user.name} was added`);
      router.push(ROUTES.ADMIN.USERS);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useUpdateUser = (id: string) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await api.put(API_ENDPOINTS.USERS.UPDATE(id), values);
      return userDetailSchema.parse(response.data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.detail(id), user);
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`${user.name} was updated`);
      router.push(ROUTES.ADMIN.USERS);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(API_ENDPOINTS.USERS.DELETE(id));
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("User deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
