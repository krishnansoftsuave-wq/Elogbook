"use client";

import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/constants/api";
import { adminKeys } from "@/features/admin/api/keys";
import {
  shiftConfigResponseSchema,
  toShiftConfig,
  toWorkflow,
  workflowListResponseSchema,
  type WorkflowKey,
} from "@/features/admin/schemas";
import { api } from "@/lib/api-client";

/**
 * The four workflow switches (FR-PA-05, FR-SUM-08, FR-ADM-06, §6.3).
 *
 * Read by every screen that shows or hides a gated control, not just by the
 * admin screens — which is why `GET /admin/workflows` is open to any
 * authenticated session while writing is gated per switch. An Operator's UI has
 * to know whether commenting is on; it cannot ask an admin-only endpoint.
 *
 * Long `staleTime`: these change when an Administrator flips one, which is rare,
 * and every screen reads them. NFR-03 (500+ concurrent users) rules out
 * refetching policy on every mount.
 */
export const useWorkflows = () =>
  useQuery({
    queryKey: adminKeys.workflows(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ADMIN.WORKFLOWS);
      const { items } = workflowListResponseSchema.parse(response.data).data;
      return items.map(toWorkflow);
    },
    staleTime: 5 * 60_000,
  });

/**
 * Whether one switch is on.
 *
 * Defaults to `false` while loading and on error — **fails closed**, which is
 * the same posture the API takes. A control that flickers into existence before
 * the answer arrives would invite a click that then 403s.
 */
export const useIsWorkflowEnabled = (key: WorkflowKey): boolean => {
  const { data } = useWorkflows();
  return data?.find((workflow) => workflow.key === key)?.enabled ?? false;
};

/**
 * **FR-HOME-03** — the shift boundaries, which the Administrator can change.
 *
 * `GET /admin/shift-config` is open to any authenticated session for the same
 * reason the workflow read is: the boundary is not a secret, and it decides what
 * "this shift" means on every screen. Writing needs the wildcard.
 *
 * Same long `staleTime` as the workflows for the same reason — a boundary
 * changes when an Administrator moves it, which is rare, and NFR-03 rules out
 * re-reading policy on every mount. `useUpdateShiftConfig` invalidates it, so
 * the rare change still propagates immediately.
 */
export const useShiftConfig = () =>
  useQuery({
    queryKey: adminKeys.shiftConfig(),
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.ADMIN.SHIFT_CONFIG);
      return toShiftConfig(shiftConfigResponseSchema.parse(response.data).data);
    },
    staleTime: 5 * 60_000,
  });
