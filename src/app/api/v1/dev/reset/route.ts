import { NextResponse } from "next/server";

import { ok } from "@/mocks/envelope";
import { isMockApiEnabled, mockDisabledEnvelope } from "@/mocks/http";
import { resetMockStore } from "@/mocks/store";

/**
 * `POST /api/v1/dev/reset` — re-seed the mock store.
 *
 * **A test affordance, and dev-only in exactly the way `/dev/token` is.** Both
 * sit behind `isMockApiEnabled()`, so a production build answers 404 and neither
 * exists to be called. Nothing in the application ever invokes this; it has no
 * hook, no constant in `API_ENDPOINTS`, and no UI.
 *
 * ## Why it had to exist
 *
 * `playwright.config.ts:22` sets `reuseExistingServer: !process.env.CI`, so a
 * local run attaches to whatever dev server is already listening — **including
 * its store**. The Supervisor specs confirm and dismiss AI suggestions, which
 * are one-way: a second run found the review queue already empty and failed on
 * a screen that was behaving correctly. The same shape bites CI differently,
 * where `retries: 2` re-enters a mutating test against the state its own first
 * attempt left behind.
 *
 * Resetting per spec file is the smallest fix that makes those tests mean
 * something. The alternative — writing assertions loose enough to pass against
 * any prior state — would have removed the thing they were testing.
 *
 * It deliberately takes no body and returns no data: there is one store and one
 * seed, so there is nothing to parameterise and nothing a caller needs back.
 */
export function POST() {
  if (!isMockApiEnabled()) {
    return NextResponse.json(mockDisabledEnvelope(), { status: 404 });
  }

  resetMockStore();

  return NextResponse.json(ok({ reset: true }));
}
