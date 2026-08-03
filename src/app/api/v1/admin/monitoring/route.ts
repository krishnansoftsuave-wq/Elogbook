import { seedSystemMonitoring } from "@/mocks/data/monitoring";
import { mockRoute, okJson } from "@/mocks/handler";
import { mockStore } from "@/mocks/store";
import { WILDCARD_PERMISSION } from "@/constants/permissions";

/**
 * `GET /api/v1/admin/monitoring` — §7.11, **FR-OBS-02** and **FR-OBS-04**.
 *
 * **Administrator-only, on `ADMIN_AUDIT`'s reasoning rather than
 * `ADMIN_WORKFLOWS`'.** §6.4 gives the Administrator *"Monitor system health;
 * review audit and AI-usage logs; manage security settings"*; §6.5's five Super
 * User bullets say nothing about system health, and FR-OBS-04 names the
 * Administrator as its only role. There is no `monitoring:read` to reach for,
 * and inventing one would both invent a requirement and *widen* access — a
 * named permission is one an Admin-created custom role (FR-ADM-02) could be
 * granted, which no requirement authorises.
 *
 * `generated_at` is stamped per request rather than seeded, because it is the
 * one honest thing this endpoint knows: when it answered. Everything else is
 * the fixed illustrative snapshot `seedSystemMonitoring` documents.
 *
 * **[BACKEND]** — real telemetry belongs to the platform, not this repo. The
 * contract here is provisional and exists so the screen can be built against
 * the shape a real one would take.
 */
export const GET = mockRoute({ permission: WILDCARD_PERMISSION }, () =>
  okJson({
    ...seedSystemMonitoring(mockStore().users.length),
    generated_at: new Date().toISOString().replace(/Z$/, "+00:00"),
  })
);
