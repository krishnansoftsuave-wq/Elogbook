import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * `/trends` — §7.7, **FR-AN-02** and the trend half of **FR-REP-01**.
 *
 * Requires the mock backend, which means `npm run dev` — `playwright.config.ts`
 * starts it by default. `e2e/summaries.spec.ts` is this file's structural
 * template; the `signIn`/`landOn`/`horizontalOverflow`/`FIRST_PAINT`/
 * `BREAKPOINTS` conventions are restated here rather than imported, because
 * `e2e/` is black box and never imports from `src/`.
 */

/** Holds `report:read` (`ROUTE_PERMISSIONS.TRENDS`), so `/trends` opens. */
const SUPERVISOR = "Fatma Al-Harthy";
/** Holds neither `report:read` nor an admin-tree permission — home is `/dashboard`. */
const OPERATOR = "Said Al-Busaidi";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/**
 * `e2e/accounts.ts` explains why this drives the callback rather than the
 * sidebar switcher — most notably that the switcher does not exist below `lg`,
 * where the `responsive` block runs. `e2e/auth.spec.ts` owns the sign-in chain.
 */
const signIn = (page: Page, displayName = SUPERVISOR) =>
  signInAs(page, displayName);

/**
 * Waits for a landing route with headroom for Next's dev server, which compiles
 * each route the first time it is requested. Under `fullyParallel` that first
 * compile regularly exceeds the 5s default.
 */
const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

const FIRST_PAINT = { timeout: 30_000 } as const;

/** How much wider the document is than the viewport, if at all. */
const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/**
 * Signs in and opens `/trends`. Waiting for the dashboard first is not
 * decoration: `signIn` finishes at `/auth/callback`, and a `goto` issued while
 * that exchange is in flight aborts it, stores no token, and gets bounced to
 * login — a failure that reads like a permission problem and is not one.
 */
const signInToTrends = async (page: Page, displayName = SUPERVISOR) => {
  await signIn(page, displayName);
  await landOn(page, /\/dashboard$/);
  await page.goto("/trends");
};

/**
 * The ADP sparkline's accessible table (`ChartFrame`'s `sr-only` fallback).
 * `KpiTrendCard` labels every `Sparkline` `${fullLabel} — daily values"`, and
 * `mocks/data/trends.ts`'s `KPI_SEEDS[0]` fixes `fullLabel` at
 * "Agreed Daily Prod." — so this table's row count tracks the active period
 * deterministically (7 → 14 → 30), independent of the series' seeded values.
 */
const adpTable = (page: Page) =>
  page.getByRole("table", { name: "Agreed Daily Prod. — daily values" });

const periodPill = (page: Page, label: "7 days" | "14 days" | "30 days") =>
  page
    .getByRole("group", { name: "Trend period" })
    .getByRole("button", { name: label });

/* -------------------------------------------------------------------------- */
/* Trends & KPIs — §7.7, FR-AN-02                                              */
/* -------------------------------------------------------------------------- */

test.describe("trends & KPIs", () => {
  test("a Supervisor sees the trends screen", async ({ page }) => {
    await signInToTrends(page);

    await expect(
      page.getByRole("heading", { name: "Trends & KPIs", level: 1 })
    ).toBeVisible(FIRST_PAINT);

    await expect(
      page.getByRole("img", { name: /Agreed Daily Prod/ })
    ).toBeVisible(FIRST_PAINT);
  });

  /**
   * **FR-ADM-03** — the guard, not the hidden link, is the control. Two
   * independent signals: the redirect destination, and the absent nav item.
   * Desktop viewport, deliberately: the sidebar is `max-lg:hidden`
   * (`components/layout/Sidebar.tsx`), so the nav-item assertion only means
   * something above `lg`.
   */
  test("an Operator is redirected away from /trends", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, OPERATOR);
    await landOn(page, /\/dashboard$/);

    await page.goto("/trends");

    // `homeForSession` returns the only route this session's permissions open
    // — `/dashboard` for the Operator — never a dead-end `/unauthorized`.
    await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByRole("link", { name: "Trends & KPIs" })).toHaveCount(
      0
    );
  });

  /**
   * The period pills are wired to the real query (`app/api/v1/trends/route.ts`
   * slices each KPI series to `PERIOD_WINDOW_DAYS[period]`), unlike the
   * prototype's pill, which never fed back into what rendered. The ADP table's
   * row count — header row plus one row per day — is the deterministic signal:
   * it does not depend on the seeded values themselves, only their count.
   */
  test("the period pills change the number of rendered data points", async ({
    page,
  }) => {
    await signInToTrends(page);
    await expect(
      page.getByRole("heading", { name: "Trends & KPIs", level: 1 })
    ).toBeVisible(FIRST_PAINT);

    const table = adpTable(page);
    await expect(table).toBeAttached(FIRST_PAINT);
    // Header row (`<thead>`) + 7 data rows (`<tbody>`) at the default period.
    await expect(table.getByRole("row")).toHaveCount(8);

    await periodPill(page, "14 days").click();
    await expect(table.getByRole("row")).toHaveCount(15);

    await periodPill(page, "30 days").click();
    await expect(table.getByRole("row")).toHaveCount(31);
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`/trends has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToTrends(page);

      await expect(
        page.getByRole("heading", { name: "Trends & KPIs", level: 1 })
      ).toBeVisible(FIRST_PAINT);

      // Wide content (the sparkline strip, the equipment table) scrolls inside
      // its own container, never the page (`.claude/rules/01`).
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

      // Wait for the real success state — not the skeleton — before the
      // screenshot, so it captures loaded content rather than placeholders.
      await expect(
        page.getByRole("heading", {
          name: "Compliance & Due-Date Status",
          level: 2,
        })
      ).toBeVisible(FIRST_PAINT);

      await page.screenshot({
        path: `screenshots/trends-${breakpoint.width}.png`,
        fullPage: true,
      });
    });
  }
});
