export const dashboardKeys = {
  all: ["dashboards"] as const,
  widgets: () => [...dashboardKeys.all, "widgets"] as const,
};
