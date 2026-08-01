"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { API_ENDPOINTS } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { adminKeys } from "@/features/admin/api/keys";
import {
  notificationPermissionDetailResponseSchema,
  roleDetailResponseSchema,
  shiftConfigResponseSchema,
  toAdminRole,
  toNotificationPermission,
  toRoleWriteWire,
  toShiftConfig,
  toWorkflow,
  WORKFLOW_LABEL,
  workflowDetailResponseSchema,
  type AdminRole,
  type NotificationPermission,
  type NotificationPermissionUpdateValues,
  type RoleFormValues,
  type ShiftConfigWire,
  type Workflow,
  type WorkflowUpdateValues,
} from "@/features/admin/schemas";
import { shiftKeys } from "@/features/shifts/api/keys";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/api-error";

/**
 * Flip one of the four workflow switches — §6.4, "Enable or disable workflow for
 * Supervisor & Management", and §6.5, "Control access to comments and the
 * decision workflow".
 *
 * The permission is checked **per key** server-side (`WORKFLOW_PERMISSION`), so
 * this hook can 403 for one switch and succeed for the next in the same session.
 * `onError` surfaces the handler's message, which names the switch and the
 * permission it wanted.
 *
 * These are the highest-leverage writes in the product. `supervisor_action_workflow`
 * decides whether **FR-PA-05**'s assignment and tracking exists at all;
 * `operator_comment_permission` decides whether **FR-SUM-08** lets an Operator
 * add a comment; `management_decision_workflow` picks between §6.3(a)'s full
 * notification workflow and §6.3(b)'s record-only. Every one of them defaults
 * off, and until this hook existed nothing in the app could turn one on.
 *
 * ## Why the cache is written twice
 *
 * `setQueryData` patches the one switch from the server's response so the card
 * settles immediately; `invalidateQueries` then refetches, because
 * `useIsWorkflowEnabled` is read by screens all over the app — the actions
 * detail, the summary comment box, the suggestions panel — and a switch flipped
 * here must reach every one of them, not just this list. `useWorkflows` carries a
 * five-minute `staleTime`, which an invalidation overrides; without it those
 * screens could show a stale capability for minutes.
 *
 * No optimistic update. A control that has just granted or revoked a capability
 * should show what the server actually recorded, not what was hoped for.
 */
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: WorkflowUpdateValues) => {
      const response = await api.patch(API_ENDPOINTS.ADMIN.WORKFLOWS, values);
      return toWorkflow(workflowDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (workflow) => {
      queryClient.setQueryData<Workflow[]>(adminKeys.workflows(), (current) =>
        current?.map((candidate) =>
          candidate.key === workflow.key ? workflow : candidate
        )
      );
      queryClient.invalidateQueries({ queryKey: adminKeys.workflows() });
      toast.success(
        `${WORKFLOW_LABEL[workflow.key]} ${workflow.enabled ? "enabled" : "disabled"}`
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * §6 / FR-ADM-02 — deletes a **custom** role. The mock handler 409s a base
 * role or a role with members before this ever runs (the prototype's own
 * "role in use" block, `app-source.txt` 1579), so `onError` is what shows a
 * blocked delete rather than a client-side guard duplicating that check.
 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(API_ENDPOINTS.ADMIN.ROLE(id));
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<AdminRole[]>(adminKeys.roles(), (current) =>
        current?.filter((role) => role.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      toast.success("Role deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * §6 / FR-ADM-02 — creates a custom role. **"activate immediately"** is why
 * there is no draft state: a successful `POST` is a live role the moment this
 * resolves, so the redirect to the Roles list is what shows it took effect,
 * the same way `useCreateEntry` redirects to the list it just added to.
 */
export const useCreateRole = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const response = await api.post(
        API_ENDPOINTS.ADMIN.ROLES,
        toRoleWriteWire(values)
      );
      return toAdminRole(roleDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      toast.success(`${role.name} created`);
      router.push(ROUTES.ADMIN.ROLES);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * §6 / FR-ADM-02 — edits a role's name, permissions, data scope or AD group
 * mapping. A `PUT` of the whole form, like `useUpdateShiftConfig`, so a retry
 * under **NFR-12** lands the same values rather than compounding a partial
 * write.
 *
 * A base role's `adGroup` reaches this hook unchanged (`RoleForm` locks that
 * field when `EditRolePanel` passes `adGroupLocked`) and the mock API pins it
 * server-side regardless — the mapping is AD's access model (**FR-AUTH-02**),
 * not something this form can rewrite. Name, permissions and data scope are
 * not part of that mapping and go through normally for any role.
 */
export const useUpdateRole = (id: string) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const response = await api.put(
        API_ENDPOINTS.ADMIN.ROLE(id),
        toRoleWriteWire(values)
      );
      return toAdminRole(roleDetailResponseSchema.parse(response.data).data);
    },
    onSuccess: (role) => {
      queryClient.setQueryData(adminKeys.role(id), role);
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      toast.success(`${role.name} updated`);
      router.push(ROUTES.ADMIN.ROLES);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * **FR-HOME-03** — "shift boundaries configurable. The Administrator can change
 * shift timings, and **report/summary generation aligns to them**."
 *
 * That last clause is why this invalidates **two** feature's keys.
 * `adminKeys.shiftConfig()` is the form's own read; `shiftKeys.all` is the
 * dashboard's shift banner, `GenerateSummaryButton`'s target shift, and every
 * citation's shift id. Without the second, an Administrator would save a new
 * boundary and watch the banner keep the old one for up to five minutes —
 * `useCurrentShift` carries a refresh interval, not a zero `staleTime`.
 *
 * It is a `PUT` of the whole object rather than a patch, which is what makes it
 * idempotent under **NFR-12**: replaying it lands the same five values.
 */
export const useUpdateShiftConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ShiftConfigWire) => {
      const response = await api.put(API_ENDPOINTS.ADMIN.SHIFT_CONFIG, values);
      return toShiftConfig(shiftConfigResponseSchema.parse(response.data).data);
    },
    onSuccess: (config) => {
      queryClient.setQueryData(adminKeys.shiftConfig(), config);
      queryClient.invalidateQueries({ queryKey: adminKeys.shiftConfig() });
      // The whole point of the requirement: everything downstream re-reads.
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
      toast.success(
        `Shift timings saved — day ${config.dayStart}–${config.dayEnd}`
      );
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

/**
 * **§6.4 / FR-NOT-01** — "Control, per user, which notifications each user
 * may view / receive."
 *
 * A `PUT` of the whole four-key permission map for one user, matching the
 * prototype's own save gesture: `togPerm` (`app-source.txt` 2021) flips one
 * cell at a time, but the row's "Save" button (line 2040) submits the whole
 * row — the client sends the full map its form already holds, not one
 * channel, which is also what makes a retry under **NFR-12** idempotent.
 *
 * `username` is a mutation argument rather than baked into the hook, since
 * `NotificationPermissionsTable` renders one row per user from a single
 * `useNotificationPermissions()` list and needs one hook shared across rows.
 */
export const useUpdateNotificationPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      values,
    }: {
      username: string;
      values: NotificationPermissionUpdateValues;
    }) => {
      const response = await api.put(
        API_ENDPOINTS.ADMIN.NOTIFICATION_PERMISSION(username),
        values
      );
      return toNotificationPermission(
        notificationPermissionDetailResponseSchema.parse(response.data).data
      );
    },
    onSuccess: (permission) => {
      queryClient.setQueryData<NotificationPermission[]>(
        adminKeys.notificationPermissions(),
        (current) =>
          current?.map((candidate) =>
            candidate.username === permission.username ? permission : candidate
          )
      );
      queryClient.invalidateQueries({
        queryKey: adminKeys.notificationPermissions(),
      });
      toast.success(`${permission.displayName}’s notification settings saved`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
