export const dashboardBuilderKeys = {
  all: ["dashboard-builder"] as const,
  configs: () => [...dashboardBuilderKeys.all, "configs"] as const,
  config: (role: string) =>
    [...dashboardBuilderKeys.all, "config", role] as const,
  library: (role: string) =>
    [...dashboardBuilderKeys.all, "library", role] as const,
  versions: (role: string) =>
    [...dashboardBuilderKeys.all, "versions", role] as const,
};
