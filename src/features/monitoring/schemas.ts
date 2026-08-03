import { z } from "zod";

import type { ChartTone } from "@/components/charts/tones";
import { envelopeSchema } from "@/lib/zod";

/**
 * Platform telemetry — §7.11.
 *
 * **FR-OBS-04** — "a **live view of application usage** — users currently
 * active and peak concurrent users — with history/trend."
 * **FR-OBS-02** — "monitoring and alerting for system and model performance."
 *
 * Shaped from the prototype's `monBase()` (app-source.txt 349–357), with three
 * changes on the way across:
 *
 * | Prototype | Here | Why |
 * | --- | --- | --- |
 * | `['Authentication · SAML', 'Healthy']` tuples | named `{ name, status }` | A two-slot tuple is read backwards eventually |
 * | `Date.now()` jitter every 4s (`tickMon`, 360) | a snapshot with `generated_at` | See below |
 * | `newReg` | `new_registrations` | FR-AUTH-02 makes AD the source of identities; the field is kept because §7.11's screen shows it, but it counts platform first-sightings, not sign-ups |
 *
 * ## Why there is no random walk
 *
 * The prototype re-randomises every metric on a 4-second timer, which makes a
 * demo look alive and means nothing: the CPU trace is `Math.random`, so a
 * viewer learns a number is "about 42" and that it moves, neither of which is
 * true of anything. This contract is a **snapshot** — the server states what it
 * observed and when — and liveness comes from the client re-fetching it, which
 * is the same shape a real telemetry backend will answer with. The mock returns
 * fixed figures for exactly that reason; only `generated_at` moves.
 *
 * PROVISIONAL field names — **[BACKEND]**. No contract covers platform
 * telemetry yet; §7.11 describes the screen, not the payload.
 */

export const HEALTH_STATUSES = ["healthy", "warning", "critical"] as const;
export const healthStatusSchema = z.enum(HEALTH_STATUSES);
export type HealthStatus = z.infer<typeof healthStatusSchema>;

/** Prototype `MON_OK` (346), as words rather than a hex pair. */
export const HEALTH_LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

const serviceHealthWireSchema = z.object({
  name: z.string(),
  status: healthStatusSchema,
});

export const systemMonitoringWireSchema = z.object({
  generated_at: z.string(),
  overall_status: healthStatusSchema,

  /*
    "Logbook Activity — This Shift" (`logKpiCard`, app-source.txt 452). Four
    figures the prototype puts above everything else on this screen.

    `deleted_entries` and `data_completeness_percent` have **no requirement
    behind them** — unlike the rest of this file, which cites FR-OBS-02/04.
    They come from the prototype and are kept because the owner asked for this
    screen to match it. Treat them as illustrative in the strongest sense: the
    platform reads the E-Logbook and does not own it (FR-DATA-01), so it is not
    obvious it could even compute either one.
  */
  audit_events_today: z.number(),
  active_users_24h: z.number(),
  provisioned_users: z.number(),
  deleted_entries: z.number(),
  data_completeness_percent: z.number(),

  /** FR-OBS-04's "users currently active and peak concurrent users". */
  total_users: z.number(),
  active_users: z.number(),
  online_users: z.number(),
  peak_concurrent_users: z.number(),
  new_registrations: z.number(),
  /** FR-OBS-04's "history/trend" — online users per hour, oldest first. */
  activity_trend: z.array(z.number()),

  services: z.array(serviceHealthWireSchema),
  api_status: healthStatusSchema,
  database_status: healthStatusSchema,
  error_rate_percent: z.number(),
  error_rate_history: z.array(z.number()),

  /** FR-OBS-02's model performance; FR-OBS-03's RAGAS lands here later. */
  ai_accuracy_percent: z.number(),
  ai_response_ms: z.number(),
  ai_requests_today: z.number(),
  ai_success_percent: z.number(),
  ai_failed_today: z.number(),

  cpu_percent: z.number(),
  memory_percent: z.number(),
  disk_percent: z.number(),
  network_percent: z.number(),
  api_response_ms: z.number(),
  api_response_history: z.array(z.number()),
});

export type SystemMonitoringWire = z.infer<typeof systemMonitoringWireSchema>;

export const systemMonitoringResponseSchema = envelopeSchema(
  systemMonitoringWireSchema
);

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
}

export interface SystemMonitoring {
  generatedAt: string;
  overallStatus: HealthStatus;
  auditEventsToday: number;
  activeUsers24h: number;
  provisionedUsers: number;
  deletedEntries: number;
  dataCompletenessPercent: number;
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  peakConcurrentUsers: number;
  newRegistrations: number;
  activityTrend: number[];
  services: ServiceHealth[];
  apiStatus: HealthStatus;
  databaseStatus: HealthStatus;
  errorRatePercent: number;
  errorRateHistory: number[];
  aiAccuracyPercent: number;
  aiResponseMs: number;
  aiRequestsToday: number;
  aiSuccessPercent: number;
  aiFailedToday: number;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkPercent: number;
  apiResponseMs: number;
  apiResponseHistory: number[];
}

export const toSystemMonitoring = (
  wire: SystemMonitoringWire
): SystemMonitoring => ({
  generatedAt: wire.generated_at,
  overallStatus: wire.overall_status,
  auditEventsToday: wire.audit_events_today,
  activeUsers24h: wire.active_users_24h,
  provisionedUsers: wire.provisioned_users,
  deletedEntries: wire.deleted_entries,
  dataCompletenessPercent: wire.data_completeness_percent,
  totalUsers: wire.total_users,
  activeUsers: wire.active_users,
  onlineUsers: wire.online_users,
  peakConcurrentUsers: wire.peak_concurrent_users,
  newRegistrations: wire.new_registrations,
  activityTrend: wire.activity_trend,
  services: wire.services,
  apiStatus: wire.api_status,
  databaseStatus: wire.database_status,
  errorRatePercent: wire.error_rate_percent,
  errorRateHistory: wire.error_rate_history,
  aiAccuracyPercent: wire.ai_accuracy_percent,
  aiResponseMs: wire.ai_response_ms,
  aiRequestsToday: wire.ai_requests_today,
  aiSuccessPercent: wire.ai_success_percent,
  aiFailedToday: wire.ai_failed_today,
  cpuPercent: wire.cpu_percent,
  memoryPercent: wire.memory_percent,
  diskPercent: wire.disk_percent,
  networkPercent: wire.network_percent,
  apiResponseMs: wire.api_response_ms,
  apiResponseHistory: wire.api_response_history,
});

/**
 * The status a utilisation reading implies — the prototype's thresholds
 * (`usageBar` 378: red above 85, amber above 70), named rather than expressed
 * as a colour so the same rule can drive a chip, a bar and an announcement.
 */
export const usageStatus = (percent: number): HealthStatus => {
  if (percent > 85) return "critical";
  if (percent > 70) return "warning";
  return "healthy";
};

/**
 * The ring colour for AI accuracy — the prototype's `accCol` (402): green at 93
 * and above, amber at 88, red below.
 *
 * A gauge without a threshold is just a number drawn in a circle. These are the
 * boundaries the prototype chose; **no requirement states them** — FR-OBS-03
 * asks for RAGAS evaluation and says nothing about what counts as acceptable —
 * so they are the designer's judgement and should be confirmed before anybody
 * treats a green ring as a pass.
 */
export const accuracyTone = (percent: number): ChartTone => {
  if (percent >= 93) return "chart-4";
  if (percent >= 88) return "chart-3";
  return "chart-5";
};
