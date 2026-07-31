"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { userKeys } from "@/features/users/api/keys";
import {
  userDetailResponseSchema,
  userListResponseSchema,
} from "@/features/users/schemas";
import type { UserFilters } from "@/features/users/types";
import { api } from "@/lib/api-client";
import { retryUnlessClientError } from "@/lib/query-retry";
import { toUser } from "@/types/user";

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
      const page = userListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toUser) };
    },
    // Keeps the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

/** Keyed by username — the directory has no synthetic id. */
export const useUser = (username: string) =>
  useQuery({
    queryKey: userKeys.detail(username),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.USERS.DETAIL(username));
      return toUser(userDetailResponseSchema.parse(response.data).data);
    },
    enabled: Boolean(username),
    retry: retryUnlessClientError,
  });
