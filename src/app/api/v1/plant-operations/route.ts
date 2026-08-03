import { seedPlantOperations } from "@/mocks/data/plantOps";
import { mockRoute, okJson } from "@/mocks/handler";

/**
 * `GET /api/v1/plant-operations` — the prototype's `specKpiSection()` data.
 *
 * ⚠️ **No requirement covers this endpoint**, and no backend will implement it
 * as written. It exists because the owner asked for the prototype's six
 * plant-operations cards to be demonstrable; `mocks/data/plantOps.ts` records
 * what that means for the figures.
 *
 * Open to any authenticated session, with no permission gate, because there is
 * no requirement to derive one from — and inventing a permission would be
 * inventing a requirement about who may see plant status, which is exactly the
 * kind of decision that belongs to the client rather than to this file.
 *
 * **[BACKEND]** — if these screens are ever ratified, the real data will come
 * from the historian and the shipping schedule, neither of which this platform
 * owns (FR-DATA-01).
 */
export const GET = mockRoute({}, () => okJson(seedPlantOperations()));
