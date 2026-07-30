"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { entryKeys } from "@/features/entries/api/keys";
import { entryDetailSchema, entryListSchema } from "@/features/entries/schemas";
import type { EntryFilters } from "@/features/entries/types";
import { api } from "@/lib/api-client";

/** Filters become request params verbatim, minus the `all` sentinel. */
const toParams = (filters: EntryFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  scope: filters.scope,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.status !== "all" ? { status: filters.status } : {}),
});

export const useEntriesList = (filters: EntryFilters) =>
  useQuery({
    queryKey: entryKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ENTRIES.LIST, {
        params: toParams(filters),
      });
      return entryListSchema.parse(response.data);
    },
    // Keeps the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });

export const useEntry = (id: string) =>
  useQuery({
    queryKey: entryKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ENTRIES.DETAIL(id));
      return entryDetailSchema.parse(response.data);
    },
    enabled: Boolean(id),
  });
