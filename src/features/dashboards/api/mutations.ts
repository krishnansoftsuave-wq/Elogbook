"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import type { Role } from "@/constants/roles";
import { dashboardKeys } from "@/features/dashboards/api/keys";
import {
  dashboardLayoutResponseSchema,
  dashboardWidgetDetailResponseSchema,
  toDashboardLayoutEntry,
  toDashboardLayoutWire,
  toDashboardWidget,
  type DashboardLayoutEntry,
  type DashboardWidget,
} from "@/features/dashboards/schemas";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

interface UpdateDashboardWidgetInput {
  id: string;
  assignedRoles: readonly Role[];
  enabled: boolean;
}

/**
 * Assign a widget to roles, or enable/disable it — **FR-DASH-02** and
 * **FR-ADM-06**: the Super User "assign[s] widgets to roles" and "control[s]
 * which metrics each role sees".
 *
 * Gated server-side on `dashboard:configure`, which only the Super User holds
 * outright; an Administrator reaches it through the wildcard (**FR-ADM-07**).
 * `onError` surfaces the handler's message rather than a generic one, so a 403
 * reads as a permission problem instead of a save that silently did nothing.
 *
 * ## Why the cache is written twice
 *
 * The same pattern `useUpdateWorkflow` established, for the same reason.
 * `setQueryData` patches the one row so the table settles without a flash;
 * `invalidateQueries` then refetches, because this list is **not** only read
 * here — every role's own dashboard composes itself from these assignments
 * (FR-DASH-01), so a change made on this screen has to reach those too.
 * `dashboardKeys.widgets()` is the shared prefix that makes one invalidation
 * cover both readers.
 *
 * No optimistic update. A control that has just granted or revoked a role's
 * sight of a metric should show what the server recorded, not what was hoped
 * for — and FR-DASH-05 makes the stakes of a wrong answer here everybody's
 * dashboard, not just this user's.
 */
export const useUpdateDashboardWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    /*
      Takes the **domain** shape (`assignedRoles`) and converts to the wire's
      snake_case here, rather than letting a component hand over an
      already-wire-shaped body. That is the boundary rule the rest of the
      feature follows — `toDashboardWidget` converts on the way in, this
      converts on the way out — and it is what lets both callers
      (`DashboardWidgetsTable` and `WidgetRoleMatrix`) stay in camelCase.
    */
    mutationFn: async ({
      id,
      assignedRoles,
      enabled,
    }: UpdateDashboardWidgetInput) => {
      const response = await api.put(API_ENDPOINTS.DASHBOARDS.WIDGET(id), {
        assigned_roles: assignedRoles,
        enabled,
      });

      return toDashboardWidget(
        dashboardWidgetDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (widget) => {
      queryClient.setQueryData<DashboardWidget[]>(
        dashboardKeys.widgets(),
        (current) =>
          current?.map((candidate) =>
            candidate.id === widget.id ? widget : candidate
          )
      );
      queryClient.invalidateQueries({ queryKey: dashboardKeys.widgets() });
      toast.success(`${widget.label} updated`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * Save this user's arrangement — **FR-DASH-04**'s "save a preferred layout".
 *
 * ## Optimistic, unlike `useUpdateDashboardWidget`
 *
 * The two look similar and are deliberately opposite. Assigning a widget to a
 * role changes what *other people* see, so that mutation waits for the server
 * and shows what was actually recorded. This one rearranges the cards in front
 * of you: waiting a round trip to see a card move is the difference between a
 * direct-manipulation UI and a form, and a failure costs nothing worse than the
 * cards springing back — which `onError` does explicitly, with a toast saying
 * so rather than leaving a layout on screen that was never saved.
 *
 * `cancelQueries` first, or an in-flight `GET` could resolve after the
 * optimistic write and restore the pre-drag order.
 *
 * No `invalidateQueries` on success. Nothing else in the app reads this key —
 * unlike the widget library, which every dashboard composes from — and the
 * `PUT` already answers with the saved layout, so a refetch would be a second
 * request for a fact already in hand.
 */
export const useSaveDashboardLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * Serialises saves for this key.
     *
     * Without a scope, `MutationCache.canRun` returns true unconditionally, so
     * two `PUT`s issued a gesture apart run in parallel and their `onSuccess`
     * callbacks land in *resolution* order. Drag a card (slow request), drag
     * another before it settles (fast request): the second writes the correct
     * layout, then the first overwrites it with the older one and the card
     * visibly springs back. The drag path is the reachable one — `WidgetFrame`
     * disables its buttons while `isSaving`, but a native drag is not gated.
     *
     * A scope makes query-core queue the second until the first settles, which
     * is the right shape here: the payload is the whole arrangement, so the last
     * write must win.
     */
    scope: { id: "dashboard-layout" },
    mutationFn: async (entries: readonly DashboardLayoutEntry[]) => {
      const response = await api.put(API_ENDPOINTS.DASHBOARDS.MY_LAYOUT, {
        items: entries.map(toDashboardLayoutWire),
      });

      return dashboardLayoutResponseSchema
        .parse(response.data)
        .data.items.map(toDashboardLayoutEntry);
    },
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.myLayout() });

      const previous = queryClient.getQueryData<DashboardLayoutEntry[]>(
        dashboardKeys.myLayout()
      );
      queryClient.setQueryData<DashboardLayoutEntry[]>(
        dashboardKeys.myLayout(),
        [...entries]
      );

      return { previous };
    },
    onError: (error, _entries, context) => {
      queryClient.setQueryData(
        dashboardKeys.myLayout(),
        context?.previous ?? []
      );
      toast.error(`Your layout was not saved. ${getErrorMessage(error)}`);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<DashboardLayoutEntry[]>(
        dashboardKeys.myLayout(),
        saved
      );
    },
  });
};
