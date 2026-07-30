"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { userKeys } from "@/features/users/api/keys";
import { userDetailSchema, userListSchema } from "@/features/users/schemas";
import type { UserFilters } from "@/features/users/types";
import { api } from "@/lib/api-client";

/** Filters become request params verbatim, minus the `all` sentinels. */
const toParams = (filters: UserFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.role !== "all" ? { role: filters.role } : {}),
  ...(filters.status !== "all" ? { status: filters.status } : {}),
});

export const useUsersList = (filters: UserFilters) =>
  useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.USERS.LIST, {
        params: toParams(filters),
      });
      return userListSchema.parse(response.data);
    },
    // Keeps the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

export const useUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.USERS.DETAIL(id));
      return userDetailSchema.parse(response.data);
    },
    enabled: Boolean(id),
  });
