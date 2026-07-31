import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { shiftConfigUpdateSchema } from "@/features/admin/schemas";
import { mockRoute, okJson, readJson } from "@/mocks/handler";
import { mockStore, recordAudit } from "@/mocks/store";

/**
 * `GET|PUT /api/v1/admin/shift-config` — **FR-HOME-03**: "shift boundaries
 * configurable. The Administrator can change shift timings, and report/summary
 * generation aligns to them."
 *
 * **Wired as of Phase 3b**, which is what makes the second half of that sentence
 * true. `currentShift(at, config)` takes this row, so saving a new start hour
 * moves the dashboard's shift banner, the window a generated summary covers and
 * the shift id on an assistant citation. It was stored and ignored for three
 * phases; `/admin/shift-config` is the screen that now edits it.
 *
 * The times are **plant-local** (`Asia/Muscat`). `mocks/shifts/constants.ts`
 * records why reading them as UTC was a defect on a live screen.
 *
 * `GET` is open to any authenticated session — a shift boundary is what every
 * dashboard renders its "current shift" against, so gating the read behind the
 * wildcard would break the screens that need it. Writing needs the wildcard.
 */
export const GET = mockRoute({}, () => okJson(mockStore().shiftConfig));

export const PUT = mockRoute(
  { permission: WILDCARD_PERMISSION },
  async ({ request, session }) => {
    const body = await readJson(request, shiftConfigUpdateSchema);
    if (!body.ok) return body.response;

    const store = mockStore();
    store.shiftConfig = body.data;

    // FR-HOME-03's timings, not one of §6.4's workflow switches.
    recordAudit(
      session,
      "UPDATE_SHIFT_CONFIG",
      `shift timings → ${body.data.day_start}–${body.data.day_end}`
    );

    return okJson(store.shiftConfig);
  }
);
