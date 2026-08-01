import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * The Supervisor's own surface, end to end — §6.2, FR-PA-01/02/03/05, FR-NOT-01.
 *
 * Most of it is not a new screen: reviewing AI-suggested actions and assigning
 * an owner are behaviours layered onto `/actions`, which the Operator already
 * has. So these specs are as much about what an **Operator does not see** as
 * about what a Supervisor does.
 *
 * Requires the mock backend (`npm run dev`), which `playwright.config.ts`
 * starts by default.
 */

const OPERATOR = "Said Al-Busaidi";
/** Holds `action:confirm` and `action:assign`; the Operator holds neither. */
const SUPERVISOR = "Fatma Al-Harthy";
const SUPER_USER = "Yousuf Al-Rawahi";

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

const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

const FIRST_PAINT = { timeout: 30_000 } as const;

/**
 * Waiting for the dashboard before navigating is not decoration: `signIn`
 * finishes at `/auth/callback`, and a `goto` issued while that exchange is in
 * flight aborts it, stores no token, and gets bounced to login.
 */
const openAt = async (page: Page, path: string, displayName = SUPERVISOR) => {
  await signIn(page, displayName);
  await landOn(page, /\/dashboard$/);
  await page.goto(path);
};

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/* -------------------------------------------------------------------------- */
/* FR-PA-01/02 — the review queue                                              */
/* -------------------------------------------------------------------------- */

/**
 * **Serial, and that is not a style choice.** These tests mutate a store the dev
 * server holds in one process, so a parallel run has one test confirming a
 * suggestion while another counts the queue. Every assertion below also names
 * the suggestion it acts on (`AI-118`) rather than counting rows, so the two
 * defences are independent: serial ordering keeps them from racing, and
 * identity-based assertions keep a stale store from producing a false pass.
 */
test.describe.configure({ mode: "serial" });

/**
 * Re-seed before this file runs. Confirming and dismissing are one-way, and
 * `playwright.config.ts:22` reuses an already-listening dev server locally — so
 * a second `npx playwright test` found the queue already emptied by the first
 * and failed against a screen that was behaving correctly. CI hits the same
 * shape through `retries: 2`.
 *
 * `POST /dev/reset` is dev-only, behind the same `isMockApiEnabled()` gate as
 * `/dev/token`; against a production build it 404s and this throws loudly rather
 * than silently testing stale data.
 */
test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/v1/dev/reset");
  expect(response.ok()).toBe(true);
});

test.describe("AI-suggested actions", () => {
  test("a Supervisor sees the review queue on pending actions", async ({
    page,
  }) => {
    await openAt(page, "/actions");

    await expect(page.getByText("AI-suggested actions")).toBeVisible(
      FIRST_PAINT
    );
    // §6.2(a)'s boundary, stated on screen.
    await expect(
      page.getByText(/No task is assigned to an operator/)
    ).toBeVisible();
  });

  /**
   * The prototype gates this on `state.role === 'supervisor'` literally
   * (app-source 1190). Here it is `action:confirm`, which an Operator lacks.
   */
  test("an Operator does not see the review queue", async ({ page }) => {
    await openAt(page, "/actions", OPERATOR);

    // Positive control first: the page itself rendered.
    await expect(
      page.getByRole("heading", { name: "Pending actions", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByText("AI-suggested actions")).toHaveCount(0);
  });

  /**
   * **FR-PA-02** — confirming records the suggestion in the shift summary, and
   * assigns nothing. The confirmation appears on `/summaries/[id]`, which
   * Phase 1b built — this is the link between the two.
   */
  test("confirming a suggestion puts it on the shift summary", async ({
    page,
  }) => {
    await openAt(page, "/actions");
    await expect(page.getByText("AI-suggested actions")).toBeVisible(
      FIRST_PAINT
    );

    // The seeded suggestion this spec owns. Named rather than "the first one",
    // so the assertion cannot pass against whatever the store happens to hold.
    const confirmButton = page.getByRole("button", {
      name: "Confirm AI-118 for the shift summary",
    });
    await expect(confirmButton).toBeVisible(FIRST_PAINT);
    await confirmButton.click();

    await expect(page.getByText(/AI-118 confirmed/)).toBeVisible(FIRST_PAINT);

    // The confirmation lands on the latest shift's summary, which is the first
    // row the sorted list returns.
    await page.goto("/summaries");
    await page
      .getByRole("link", { name: /^SUM-\d{8}-[DN]$/ })
      .first()
      .click();

    await landOn(page, /\/summaries\/SUM-/);
    await expect(page.getByText("AI action confirmations")).toBeVisible(
      FIRST_PAINT
    );
    await expect(
      page.getByText("Inspect XV-118 relief valve for passing")
    ).toBeVisible();
  });

  test("dismissing takes a suggestion out of the queue", async ({ page }) => {
    await openAt(page, "/actions");

    const dismiss = page.getByRole("button", { name: "Dismiss AI-204" });
    await expect(dismiss).toBeVisible(FIRST_PAINT);
    await dismiss.click();

    await expect(page.getByText(/AI-204 dismissed/)).toBeVisible(FIRST_PAINT);
    // Gone by name, not by count — a count would depend on what every other
    // test in this file had already ruled on.
    await expect(dismiss).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */
/* FR-PA-03/05 — owner assignment                                              */
/* -------------------------------------------------------------------------- */

test.describe("owner assignment", () => {
  /**
   * **FR-PA-05** — assignment is available "only when the Administrator enables
   * the workflow", and it seeds **off**. §6.2(a) calls that "the default", so
   * the screen states it as configuration rather than as a failure.
   */
  test("a Supervisor is told assignment is switched off, not shown a dead control", async ({
    page,
  }) => {
    await openAt(page, "/actions");
    await page.getByRole("link", { name: "ACT-2041" }).click();
    await landOn(page, /\/actions\/ACT-2041$/);

    await expect(
      page.getByText(/Assignment is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByLabel("Assign an owner")).toHaveCount(0);
  });

  test("an Operator sees who owns it, with no control", async ({ page }) => {
    await openAt(page, "/actions/ACT-2041", OPERATOR);

    await expect(
      page.getByRole("heading", { name: /XV-118/, level: 1 })
    ).toBeVisible(FIRST_PAINT);

    // Assert the owner is *shown*, not only that the control is absent — two
    // absences would have passed against a component that rendered nothing.
    await expect(
      page.getByText(/Owned by |This action has no owner\./)
    ).toBeVisible();

    await expect(page.getByLabel("Assign an owner")).toHaveCount(0);
    await expect(
      page.getByText(/Assignment is turned off by your administrator/)
    ).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */
/* FR-NOT-01 — notifications                                                   */
/* -------------------------------------------------------------------------- */

test.describe("notifications", () => {
  test("the tray opens and reaches the full list", async ({ page }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await page.getByRole("button", { name: /^Notifications,/ }).click();

    // Exact: the dashboard also carries a "View all pending actions" link.
    const viewAll = page.getByRole("link", {
      name: /^View all( \d+)? notifications$/,
    });
    await expect(viewAll).toBeVisible(FIRST_PAINT);

    // Actually follow it — the earlier version stopped at "the link is visible",
    // which the test's own name claimed was reaching a target.
    await viewAll.click();
    await landOn(page, /\/notifications$/);
    await expect(
      page.getByRole("heading", { name: "Notifications", level: 1 })
    ).toBeVisible(FIRST_PAINT);
  });

  /**
   * Driven as the **Operator**, deliberately. `mocks/data/notifications.ts`
   * gives the Operator four rows — two unread, two read — and the Supervisor
   * three, *all read*. Run as the Supervisor this could only assert that
   * filtering an all-read inbox yields nothing, which proves the empty state
   * rather than the filter. I had written it that way and it failed, which is
   * how the fixture asymmetry surfaced.
   */
  test("filtering to unread changes the rows, not just the button", async ({
    page,
  }) => {
    await openAt(page, "/notifications", OPERATOR);

    // Wait for the list, not the heading: the heading renders before the query
    // resolves, so counting then measures an empty list.
    const rows = page.getByRole("listitem");
    await expect(rows.first()).toBeVisible(FIRST_PAINT);
    const before = await rows.count();
    expect(before).toBeGreaterThan(0);

    // Scoped and exact: the header tray's own button is named "Notifications,
    // N unread", which a substring match on "Unread" also hits.
    const tabs = page.getByRole("group", { name: "Filter notifications" });
    await tabs.getByRole("button", { name: "Unread", exact: true }).click();

    await expect(
      tabs.getByRole("button", { name: "Unread", exact: true })
    ).toHaveAttribute("aria-pressed", "true");

    // The set actually shrank, and everything left is unread — which is what the
    // filter claims. Asserting only `aria-pressed` proved neither.
    await expect(rows).not.toHaveCount(before);
    await expect(rows.filter({ hasNotText: "Unread" })).toHaveCount(0);
  });

  /** FR-NOT-01's email half is an SMTP relay (§3.3) — said, not implied. */
  test("the screen discloses that email is not shown here", async ({
    page,
  }) => {
    await openAt(page, "/notifications");

    await expect(page.getByText(/Email delivery is handled/)).toBeVisible(
      FIRST_PAINT
    );
  });

  test("an Operator reaches notifications too — FR-NOT-01 is all roles", async ({
    page,
  }) => {
    await signIn(page, OPERATOR);
    await landOn(page, /\/dashboard$/);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Notifications" })
      .click();

    await landOn(page, /\/notifications$/);
  });

  test("a Super User cannot reach /notifications by typing the URL", async ({
    page,
  }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    await page.goto("/notifications");

    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 30_000 });
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the review queue has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/actions");
      await expect(page.getByText("AI-suggested actions")).toBeVisible(
        FIRST_PAINT
      );

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`notifications have no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/notifications");
      await expect(
        page.getByRole("heading", { name: "Notifications", level: 1 })
      ).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Dark mode                                                                   */
/* -------------------------------------------------------------------------- */

test.describe("dark mode", () => {
  test("the review queue and notifications render under the dark theme", async ({
    page,
  }) => {
    await signIn(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await landOn(page, /\/dashboard$/);

    await page.goto("/actions");
    await expect(page.getByText("AI-suggested actions")).toBeVisible(
      FIRST_PAINT
    );

    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Notifications", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
