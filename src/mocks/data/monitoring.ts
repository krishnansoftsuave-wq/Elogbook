import type { SystemMonitoringWire } from "@/features/monitoring/schemas";

/**
 * Platform telemetry — §7.11, **FR-OBS-02** and **FR-OBS-04**.
 *
 * Figures follow the prototype's `monBase()` (app-source.txt 349–357), which is
 * where they came from and the only source there is: no telemetry backend
 * exists, and §7.11 specifies the screen rather than the numbers.
 *
 * **These are illustrative, and the screen says so.** That is the whole reason
 * they are a fixed snapshot rather than the prototype's 4-second `Math.random`
 * walk (`tickMon`, 360): invented numbers that also *move* read as measurements,
 * and somebody would eventually report a CPU spike that was a random number
 * generator. Fixed figures with a moving `generated_at` demonstrate the polling
 * contract — which is the part that carries over to a real backend — without
 * pretending to observe anything.
 *
 * `total_users` is the one figure that is not invented: it is the length of the
 * mock directory, so the number on this screen agrees with `/admin/users`.
 */
export const seedSystemMonitoring = (
  totalUsers: number
): Omit<SystemMonitoringWire, "generated_at"> => ({
  /*
    Healthy, matching the prototype's own default (`monBase` 352). An earlier
    seed said "warning" to exercise the degraded state, which is a reasonable
    instinct and the wrong default for a demo — the header chip is the first
    thing anybody reads on this screen. "Historian Sync" below is still a
    warning, so the degraded row is demonstrable without the whole platform
    claiming to be unwell.
  */
  overall_status: "healthy",

  // `logKpiCard` (452) — the prototype's four shift-activity figures.
  audit_events_today: 486,
  active_users_24h: 142,
  provisioned_users: 190,
  deleted_entries: 3,
  data_completeness_percent: 88,

  total_users: totalUsers,
  active_users: 28,
  online_users: 12,
  /** FR-OBS-04 names this explicitly: "peak concurrent users". */
  peak_concurrent_users: 34,
  new_registrations: 5,
  // Twelve hourly readings, oldest first — the prototype's `activity` array.
  activity_trend: [14, 18, 22, 19, 26, 24, 28, 31, 27, 33, 29, 34],

  /*
    "Historian Sync: Warning" is the prototype's own choice and is kept. A board
    where every light is green demonstrates nothing about the degraded state,
    and this screen exists to show that state — it is also what makes
    `overall_status` warning rather than healthy.
  */
  services: [
    { name: "Authentication · SAML", status: "healthy" },
    { name: "AI Inference Service", status: "healthy" },
    { name: "Historian Sync", status: "warning" },
    { name: "Notification Service", status: "healthy" },
    { name: "Report Generator", status: "healthy" },
  ],
  api_status: "healthy",
  database_status: "healthy",
  error_rate_percent: 0.4,
  error_rate_history: [0.6, 0.5, 0.7, 0.4, 0.5, 0.3, 0.5, 0.4],

  ai_accuracy_percent: 94.2,
  ai_response_ms: 480,
  ai_requests_today: 18243,
  ai_success_percent: 98.7,
  ai_failed_today: 237,

  cpu_percent: 42,
  memory_percent: 63,
  disk_percent: 57,
  network_percent: 38,
  api_response_ms: 120,
  api_response_history: [110, 125, 118, 130, 122, 115, 128, 120],
});
