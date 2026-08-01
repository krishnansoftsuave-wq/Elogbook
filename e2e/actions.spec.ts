import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * The Operator's pending-actions path, end to end — §7.6.
 *
 * This is the first e2e in the project that drives real screens rather than the
 * sign-in chain, and the first place the 375 / 768 / 1440 claim can honestly be
 * made: jsdom cannot lay anything out, so every earlier "responsive" assertion
 * was a structural proxy.
 *
 * Requires the mock backend, which means `npm run dev` — `playwright.config.ts`
 * starts it by default. Against `PLAYWRIGHT_BASE_URL` pointing at a production
 * build these correctly fail to sign in, because `/dev/token` 404s there by
 * design (`src/mocks/http.ts`).
 */

/** The Operator fixture — one AD group, one role (`mocks/auth/directory.ts`). */
const OPERATOR = "Said Al-Busaidi";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/**
 * `e2e/accounts.ts` explains why this drives the callback rather than the
 * sidebar switcher: the switcher does not exist below `lg`, and the
 * `responsive` block below runs at 375 and 768. `e2e/auth.spec.ts` owns the
 * sign-in chain itself.
 */
const signIn = (page: Page, displayName = OPERATOR) =>
  signInAs(page, displayName);

/**
 * Waits for a landing route with headroom for Next's dev server, which compiles
 * each route the first time it is requested. Under `fullyParallel` that first
 * compile regularly exceeds the 5s default and made these specs flap — a slow
 * build step, not a slow app.
 */
const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

/**
 * The first thing rendered after a navigation, waited for with the same
 * headroom. Every one of these follows a route the dev server may be compiling
 * for the first time, and the default 5s expect timeout made the suite flap
 * between runs.
 */
const FIRST_PAINT = { timeout: 30_000 } as const;

/** The seeded action every spec navigates by. */
const actionLink = (page: Page) => page.getByRole("link", { name: "ACT-2041" });

/**
 * Signs in and opens the pending-actions list.
 *
 * Phase 1b moved the landing route to `/dashboard`, so signing in no longer
 * *arrives* here. Waiting for the dashboard before navigating is not
 * decoration: `signIn` finishes at `/auth/callback`, and a `goto` issued while
 * that exchange is in flight aborts it, stores no token, and gets bounced to
 * login — a failure that reads exactly like a permission problem and is not one.
 */
const signInToActions = async (page: Page, displayName = OPERATOR) => {
  await signIn(page, displayName);
  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
  await page.goto("/actions");
};

const seeList = async (page: Page) => {
  await expect(actionLink(page)).toBeVisible(FIRST_PAINT);
};

/** How much wider the document is than the viewport, if at all. */
const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

test.describe("pending actions", () => {
  /**
   * Phase 1b moved the landing route again, to `/dashboard` — see
   * `e2e/summaries.spec.ts`, which owns the FR-AUTH-01 assertion now. What this
   * checks is that pending actions is still *reachable*, by its nav item rather
   * than by being the place everyone happens to arrive.
   */
  test("an Operator reaches pending actions from the sidebar", async ({
    page,
  }) => {
    // Deliberately not `signInToActions`: this test is about the nav item
    // getting there, so it must not `goto` the route itself.
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    // Scoped to the nav landmark. Unscoped, this also matches the dashboard's
    // own "View all pending actions" link — Playwright's `name` is a substring
    // match, so two elements resolve and strict mode refuses the click.
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Pending actions" })
      .click();

    await landOn(page, /\/actions$/);
    await expect(
      page.getByRole("heading", { name: "Pending actions", level: 1 })
    ).toBeVisible(FIRST_PAINT);
  });

  test("the list loads real rows from the mock backend", async ({ page }) => {
    await signInToActions(page);

    // The seed ports all fourteen prototype actions.
    await seeList(page);
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("the ID opens the detail screen and comes back", async ({ page }) => {
    await signInToActions(page);

    // Wait for the row before clicking it: the table renders skeletons first,
    // and clicking into a skeleton is how this went flaky.
    await seeList(page);
    await actionLink(page).click();

    await expect(page).toHaveURL(/\/actions\/ACT-2041$/);
    await expect(
      page.getByRole("heading", {
        name: "Relief valve XV-118 set-pressure verification",
      })
    ).toBeVisible(FIRST_PAINT);

    await page.getByRole("link", { name: /Back to list/ }).click();
    await expect(page).toHaveURL(/\/actions$/);
  });

  /**
   * The Select popup Base UI renders cannot be laid out by jsdom, so the unit
   * suite drives the checkbox instead. This is where the real control is
   * exercised.
   */
  test("filtering by status narrows the list", async ({ page }) => {
    await signInToActions(page);
    await seeList(page);

    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Completed" }).click();

    await expect(page.getByText("Completed").first()).toBeVisible();
    // ACT-2041 seeds `open`, so it must drop out.
    await expect(page.getByRole("link", { name: "ACT-2041" })).toHaveCount(0);
  });

  test("search narrows the list and clears again", async ({ page }) => {
    await signInToActions(page);

    await expect(page.getByLabel("Search actions")).toBeVisible(FIRST_PAINT);
    await page.getByLabel("Search actions").fill("XV-118");
    await expect(actionLink(page)).toBeVisible();

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByLabel("Search actions")).toHaveValue("");
  });

  /**
   * FR-PA-05 / §6.2(a) — the workflow seeds **off**, so tracking is unavailable
   * and the screen says so rather than offering a control that would 403.
   */
  test("action tracking is explained as off, not silently missing", async ({
    page,
  }) => {
    await signInToActions(page);
    await seeList(page);
    await actionLink(page).click();

    await expect(
      page.getByText(/Action tracking is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByLabel("Change action status")).toHaveCount(0);
  });

  /** FR-SUM-08 / §6.1 — an Operator is view-only until access is granted. */
  test("commenting is view-only for an Operator by default", async ({
    page,
  }) => {
    await signInToActions(page);
    await seeList(page);
    await actionLink(page).click();

    await expect(
      page.getByText(/Commenting is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);
  });

  /** FR-ADM-03 — the guard, not the hidden link, is the access control. */
  test("a Super User cannot reach /actions by typing the URL", async ({
    page,
  }) => {
    await signIn(page, "Yousuf Al-Rawahi");

    // Wait for the token exchange to land before navigating. Without this the
    // `goto` aborts `/auth/callback` mid-flight, no token is ever stored, and
    // the guard bounces to login — which looks like a permission failure and is
    // not one.
    await landOn(page, /\/admin\/users/);

    await page.goto("/actions");

    // `homeForSession` returns the only route this session's permissions open,
    // never a dead-end `/unauthorized`.
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  /** The nav is permission-filtered, so a Super User is not offered the link. */
  test("a Super User is not shown the pending-actions nav item", async ({
    page,
  }) => {
    await signIn(page, "Yousuf Al-Rawahi");
    await landOn(page, /\/admin\/users/);

    await expect(
      page.getByRole("link", { name: "Pending actions" })
    ).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the list has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToActions(page);
      await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

      // Wide content scrolls inside its own container, never the page
      // (`.claude/rules/01`). DataTable wraps the table in `overflow-x-auto`.
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the detail screen has no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToActions(page);
      await seeList(page);
      await actionLink(page).click();
      await expect(
        page.getByRole("heading", { level: 1, name: /XV-118/ })
      ).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Dark mode                                                                   */
/* -------------------------------------------------------------------------- */

test.describe("dark mode", () => {
  /**
   * Dark mode is driven by `.dark` on `<html>` (`hooks/useThemeSync.ts`). This
   * asserts the screens render under it — it cannot assert *legibility*, which
   * is why the token contrast ratios are computed and recorded in
   * `globals.css` instead.
   */
  test("the list and detail render under the dark theme", async ({ page }) => {
    await signInToActions(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));

    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
    await seeList(page);

    await actionLink(page).click();
    await expect(
      page.getByRole("heading", { level: 1, name: /XV-118/ })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
