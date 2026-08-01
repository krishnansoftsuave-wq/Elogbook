"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { auditKeys } from "@/features/audit/api/keys";
import {
  auditListResponseSchema,
  toAuditEvent,
} from "@/features/audit/schemas";
import type { AuditFilters } from "@/features/audit/types";
import { api } from "@/lib/api-client";

/** Filters become request params verbatim, minus the `all` sentinels. */
const toParams = (filters: AuditFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  ...(filters.username !== "all" ? { username: filters.username } : {}),
  ...(filters.action !== "all" ? { action: filters.action } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
});

/**
 * **FR-ADM-05**, **§9.3**, **FR-OBS-01** — the trail sixteen handlers have been
 * writing to since Phase 0a with nothing on the other end to read it.
 *
 * `staleTime: 0`, deliberately, against this repo's 60-second default. Every
 * other query here reads a resource that changes when somebody edits it; this
 * one grows as a side effect of *any* action anywhere in the product, so a
 * cached page is stale the moment its reader does anything. Coming back to the
 * tab and seeing what you just did is the whole point of the screen.
 *
 * No `refetchInterval` — NFR-03 rules out a poll on a screen only administrators
 * open, and an audit log is read deliberately rather than watched.
 */
export const useAuditTrail = (filters: AuditFilters) =>
  useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.AUDIT.LIST, {
        params: toParams(filters),
      });
      const page = auditListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toAuditEvent) };
    },
    staleTime: 0,
    // Keeps the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
