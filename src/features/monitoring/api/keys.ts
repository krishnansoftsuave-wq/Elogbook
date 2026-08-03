/**
 * Query keys for platform telemetry — §7.11.
 *
 * One key with no parameters: `GET /admin/monitoring` takes none, because
 * there is exactly one platform to observe.
 */
export const monitoringKeys = {
  all: ["monitoring"] as const,
  system: () => [...monitoringKeys.all, "system"] as const,
};
