"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS, MAX_PAGE_SIZE } from "@/constants/api";
import { actionKeys } from "@/features/actions/api/keys";
import {
  actionCommentListResponseSchema,
  actionDetailResponseSchema,
  actionListResponseSchema,
  toAction,
  toActionComment,
} from "@/features/actions/schemas";
import type { ActionFilters } from "@/features/actions/types";
import { api } from "@/lib/api-client";
import { DASHBOARD_REFRESH } from "@/lib/query-refresh";
import { retryUnlessClientError } from "@/lib/query-retry";
import { isActionOverdue, type ActionStatus } from "@/types/operations";

/**
 * Filters become request params verbatim, minus the `all` sentinels and the
 * empty search — the shape `features/users/api/queries.ts` established.
 *
 * `overdue` is sent only when true. It is FR-PA-06's *derived* flag, not a
 * status, so the server computes it; the client never filters on a status that
 * does not exist.
 */
const toParams = (filters: ActionFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  ...(filters.search ? { search: filters.search } : {}),
  ...(filters.status !== "all" ? { status: filters.status } : {}),
  ...(filters.priority !== "all" ? { priority: filters.priority } : {}),
  ...(filters.area !== "all" ? { area: filters.area } : {}),
  ...(filters.overdueOnly ? { overdue: true } : {}),
});

export const useActionsList = (filters: ActionFilters) =>
  useQuery({
    queryKey: actionKeys.list(filters),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.LIST, {
        params: toParams(filters),
      });
      const page = actionListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toAction) };
    },
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: keepPreviousData,
  });

export const useAction = (id: string) =>
  useQuery({
    queryKey: actionKeys.detail(id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.DETAIL(id));
      return toAction(actionDetailResponseSchema.parse(response.data).data);
    },
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  });

/**
 * The comment thread. A separate query from the action itself so posting a
 * comment invalidates the thread without refetching the record — and so the
 * 403 that FR-SUM-08's toggle produces on *writing* never blocks *reading*.
 */
export const useActionComments = (id: string) =>
  useQuery({
    queryKey: actionKeys.comments(id),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.COMMENTS(id), {
        params: { pageSize: MAX_PAGE_SIZE },
      });
      const page = actionCommentListResponseSchema.parse(response.data).data;

      return { ...page, items: page.items.map(toActionComment) };
    },
    enabled: Boolean(id),
    retry: retryUnlessClientError,
  });

/**
 * How many actions sit in each of FR-PA-04's six states, plus how many are
 * overdue — what the dashboard's "pending actions" widgets read (FR-HOME-01).
 *
 * ⚠️ **Counted on the client, from one capped page.** `/actions` has no
 * aggregate endpoint, so this reads up to `MAX_PAGE_SIZE` rows and tallies them.
 * That is exact for the seeded plant and **wrong past 100 open actions**, which
 * a real one would exceed. The honest fix is a `GET /actions/stats` the backend
 * computes; this hook is the placeholder, and it is the only thing that changes
 * when that lands.
 *
 * Overdue is derived per row with `isActionOverdue` rather than fetched with
 * `overdue=true`, because a second request would be judged at a second instant —
 * a row could be counted in neither bucket or in both.
 */
export const useActionStatusCounts = () =>
  useQuery({
    queryKey: actionKeys.statusCounts(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.LIST, {
        params: { page: 1, pageSize: MAX_PAGE_SIZE },
      });
      const page = actionListResponseSchema.parse(response.data).data;
      const now = new Date();

      /*
        Written out rather than built from `ACTION_STATUS_VALUES`, because
        `Record<ActionStatus, number>` then makes TypeScript *check* that all six
        of FR-PA-04's states are present. The `Object.fromEntries` version needed
        an `as` cast to type at all — which the lint rule rightly refused — and a
        cast would have silently accepted a missing key, leaving a tile reading
        `undefined` if the status vocabulary ever grew.
      */
      const byStatus: Record<ActionStatus, number> = {
        open: 0,
        in_progress: 0,
        on_hold: 0,
        completed: 0,
        cancelled: 0,
        verified: 0,
      };

      let overdue = 0;
      for (const wire of page.items) {
        const action = toAction(wire);
        byStatus[action.status] += 1;
        if (isActionOverdue(action.dueAt, action.status, now)) overdue += 1;
      }

      return {
        byStatus,
        overdue,
        total: page.total,
        counted: page.items.length,
      };
    },
    ...DASHBOARD_REFRESH,
  });

/**
 * Who an action may be assigned to (**FR-PA-03**).
 *
 * ⚠️ **A stand-in, and a narrower one than `useActionAreas`.** There is no
 * assignable-users endpoint in this build at all — `API_ENDPOINTS.USERS` has no
 * route handler — so this derives people from the actions themselves: every
 * distinct owner, plus every distinct creator, which between them cover the
 * operators and supervisors already working the plant.
 *
 * What that cannot do is offer somebody who has neither created nor been
 * assigned an action. On a real plant that is a new joiner, and they would be
 * unassignable. The real source is the user directory behind
 * `GET /users` (§6.4 — the Administrator manages users); when it lands, this
 * hook changes and nothing else does.
 *
 * `/admin/notification-permissions` does list users and is *not* the answer: it
 * is wildcard-gated, so the Supervisor who needs this list cannot read it.
 */
export const useAssignableOwners = (enabled = true) =>
  useQuery({
    queryKey: actionKeys.assignableOwners(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.LIST, {
        params: { page: 1, pageSize: MAX_PAGE_SIZE },
      });
      const page = actionListResponseSchema.parse(response.data).data;

      const people = new Map<string, { username: string; label: string }>();
      for (const wire of page.items) {
        const action = toAction(wire);
        for (const actor of [action.owner, action.createdBy]) {
          if (actor) {
            people.set(actor.username, {
              username: actor.username,
              label: actor.displayName,
            });
          }
        }
      }

      return [...people.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    },
    enabled,
    // People are directory data, not shift data (NFR-03).
    staleTime: 5 * 60_000,
  });

/**
 * The distinct areas an Area filter may offer.
 *
 * **Deliberately a separate, unfiltered query.** Deriving the option list from
 * the list response was a real bug: `/actions` filters by area server-side, so
 * selecting "Utilities" made the response contain only Utilities, which made the
 * dropdown offer only Utilities — the control removed its own alternatives.
 * Paging had the same effect for any area whose rows fell on page 2.
 *
 * **FR-HOME-04** — "Allow browsing of previous shifts, dates, and **other
 * areas**" — is exactly what that broke.
 *
 * ⚠️ **Stand-in.** BRD §6.2 has the Administrator define the area/unit/train
 * list, so the real source is admin configuration, not a scan of the actions
 * table. There is no such endpoint in the Phase 0a contract; when one lands,
 * this hook changes and nothing else does.
 */
export const useActionAreas = () =>
  useQuery({
    queryKey: actionKeys.areas(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ACTIONS.LIST, {
        params: { page: 1, pageSize: MAX_PAGE_SIZE },
      });
      const page = actionListResponseSchema.parse(response.data).data;

      return [...new Set(page.items.map((action) => action.area))].sort();
    },
    // Areas are configuration, not shift data — they do not change while a
    // screen is open, and NFR-03 rules out refetching them per mount.
    staleTime: 5 * 60_000,
  });
