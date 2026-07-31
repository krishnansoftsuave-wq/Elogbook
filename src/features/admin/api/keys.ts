export const adminKeys = {
  all: ["admin"] as const,
  workflows: () => [...adminKeys.all, "workflows"] as const,
  shiftConfig: () => [...adminKeys.all, "shift-config"] as const,
  notificationPermissions: () =>
    [...adminKeys.all, "notification-permissions"] as const,
};
