import { seedPlatformOverview } from "@/mocks/data/platform";
import { mockRoute, okJson } from "@/mocks/handler";

/**
 * `GET /api/v1/platform-overview` — the Super User dashboard's four cards
 * (`dashboard()` for `superuser`, app-source.txt 1133–1165).
 *
 * ⚠️ **No requirement covers this endpoint.** §6.5 describes the Super User's
 * job — dashboard configuration and permission management — not their home
 * screen, so the cards come from the prototype alone.
 * `mocks/data/platform.ts` records what that means for the figures.
 *
 * ## Why not `/admin/monitoring`
 *
 * Half of this payload is telemetry that endpoint already serves. It is not
 * reused because that route is gated on the **wildcard permission**: §6.4 gives
 * system health to the Administrator and §6.5 says nothing about it for the
 * Super User. Relaxing that gate so a dashboard card could draw would have been
 * an access-control decision made by a widget, and it would have handed every
 * Admin-created custom role (FR-ADM-02) the monitoring board along with it.
 *
 * ## Open to any authenticated session, with no permission gate
 *
 * The same reasoning as `/plant-operations`: there is no requirement to derive
 * one from, and inventing a permission would invent a requirement about who may
 * see headcounts and service health. The figures are illustrative in any case.
 * Reaching the data still requires a valid token, and the widgets that draw it
 * are assigned to nobody but the Super User.
 *
 * **[BACKEND]** — a real implementation would read the directory, the service
 * registry and the backup log, none of which this repo owns.
 */
export const GET = mockRoute({}, () => okJson(seedPlatformOverview()));
