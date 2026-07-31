import { expect, test, type Page } from "@playwright/test";

/**
 * The Operator's dashboard and shift-summary path, end to end — §7.2 and §7.5.
 *
 * This spec owns the **FR-AUTH-01** landing assertion, which moved here from
 * `e2e/actions.spec.ts` when Phase 1b put `/dashboard` ahead of `/actions`.
 *
 * Requires the mock backend, which means `npm run dev` — `playwright.config.ts`
 * starts it by default. Against a production build these correctly fail to sign
 * in, because `/dev/token` 404s there by design (`src/mocks/http.ts`).
 */

const SSO_BUTTON = "Sign in with Oman LNG Account";

/** The Operator fixture — one AD group, one role (`mocks/auth/directory.ts`). */
const OPERATOR = "Said Al-Busaidi";
/** Holds `summary:comment` outright, unlike the Operator (FR-SUM-08). */
const SUPERVISOR = "Fatma Al-Harthy";
/** Holds `user:read` and nothing operational — the 403 fixture. */
const SUPER_USER = "Yousuf Al-Rawahi";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const signIn = async (page: Page, displayName = OPERATOR) => {
  await page.goto("/auth/login");
  await page.getByRole("button", { name: SSO_BUTTON }).click();
  await page.getByRole("button", { name: new RegExp(displayName) }).click();
};

/**
 * Waits for a landing route with headroom for Next's dev server, which compiles
 * each route the first time it is requested. Under `fullyParallel` that first
 * compile regularly exceeds the 5s default.
 */
const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

const FIRST_PAINT = { timeout: 30_000 } as const;

/**
 * Signs in and opens the summaries list. Waiting for the dashboard first is not
 * decoration: `signIn` finishes at `/auth/callback`, and a `goto` issued while
 * that exchange is in flight aborts it, stores no token, and gets bounced to
 * login — a failure that reads like a permission problem and is not one.
 */
const signInToSummaries = async (page: Page, displayName = OPERATOR) => {
  await signIn(page, displayName);
  await landOn(page, /\/dashboard$/);
  await page.goto("/summaries");
};

/** The first summary row, whichever shift the seed generated it for. */
const firstSummaryLink = (page: Page) =>
  page.getByRole("link", { name: /^SUM-\d{8}-[DN]$/ }).first();

/** How much wider the document is than the viewport, if at all. */
const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/* -------------------------------------------------------------------------- */
/* The dashboard — FR-AUTH-01, FR-HOME-01..05                                  */
/* -------------------------------------------------------------------------- */

test.describe("operations dashboard", () => {
  /**
   * **FR-AUTH-01** — "map to a role and redirect to a role-based dashboard."
   *
   * Two earlier landing routes were acknowledged stand-ins: `/logbook` (whose
   * endpoint has no mock handler, so it showed a connection error) and
   * `/actions` (one quarter of what FR-HOME-01 defines). This is the first that
   * meets the requirement.
   */
  test("an Operator lands on the dashboard after signing in", async ({
    page,
  }) => {
    await signIn(page);

    await landOn(page, /\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Operations dashboard", level: 1 })
    ).toBeVisible(FIRST_PAINT);
  });

  /**
   * **FR-HOME-03** — "Define a shift as a 12-hour period (06:00–06:15 overlap)".
   * Served live from `GET /shifts/current`, so the assertion is on the shape of
   * the banner rather than a fixed date the seed would move.
   */
  test("the shift banner names the shift and its handover overlap", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await expect(page.getByText(/handover overlap/)).toBeVisible(FIRST_PAINT);
    await expect(page.getByText(/(Day|Night) shift/)).toBeVisible();
  });

  /**
   * **FR-HOME-02** — the view defaults to "everything the user may see (full
   * plant)". §9.2 records that the client removed area filtering, so full-plant
   * is stated rather than selected.
   */
  test("the dashboard states full-plant scope and offers no area filter", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await expect(page.getByText(/Entire plant/)).toBeVisible(FIRST_PAINT);
    await expect(page.getByLabel(/Filter by area/)).toHaveCount(0);
  });

  /** FR-HOME-01's "pending actions", as the KPI region. */
  test("the KPI tiles report counts from the real backend", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    const kpis = page.getByRole("region", { name: "Shift KPIs" });
    await expect(kpis).toBeVisible(FIRST_PAINT);
    // The seed always has open actions, so the tile must resolve to a number.
    await expect(kpis.getByText(/^\d+$/).first()).toBeVisible(FIRST_PAINT);
  });

  /**
   * The chart carries the accessible equivalent `ChartFrame` provides — a real
   * table of the same series. `SCREENS.md` records that the prototype's charts
   * have none, and this is where that gap is closed rather than claimed.
   */
  test("the status chart has a table equivalent, not just an aria-label", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await expect(
      page.getByRole("img", { name: "Pending actions by status" })
    ).toBeVisible(FIRST_PAINT);
    await expect(
      page.getByRole("table", { name: "Pending actions by status" })
    ).toBeAttached();
  });

  /**
   * **FR-DASH-04** caps a regular user at hiding, resizing and saving widget
   * layout; §6.4 gives chart-type switching to the Administrator. The prototype
   * puts a bar/pie toggle on the operator's dashboard (`app-source.txt` 561) —
   * the BRD outranks it.
   */
  test("no chart-type toggle is offered to a regular user", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);
    await expect(page.getByText("Pending actions by status")).toBeVisible(
      FIRST_PAINT
    );

    await expect(page.getByRole("group", { name: /Chart type/ })).toHaveCount(
      0
    );
  });

  test("the dashboard links through to the previous shift summary", async ({
    page,
  }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await page.getByRole("link", { name: "Open summary" }).click();

    await landOn(page, /\/summaries\/SUM-/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(
      FIRST_PAINT
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Shift summaries — §7.5                                                      */
/* -------------------------------------------------------------------------- */

test.describe("shift summaries", () => {
  test("the list loads real rows from the mock backend", async ({ page }) => {
    await signInToSummaries(page);

    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("the ID opens the detail screen and comes back", async ({ page }) => {
    await signInToSummaries(page);

    // Wait for the row before clicking it: the table renders skeletons first.
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await firstSummaryLink(page).click();

    // `landOn`, not a bare `toHaveURL`: client-side navigation cannot complete
    // until the dev server has compiled `/summaries/[id]`, and on a cold run
    // that exceeds the 5s default. Waiting for the URL with headroom is the
    // same correction `e2e/actions.spec.ts` records.
    await landOn(page, /\/summaries\/SUM-\d{8}-[DN]$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(
      FIRST_PAINT
    );

    await page.getByRole("link", { name: /Back to list/ }).click();
    await landOn(page, /\/summaries$/);
  });

  test("search narrows the list and clears again", async ({ page }) => {
    await signInToSummaries(page);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);

    await page.getByLabel("Search summaries").fill("no-such-summary");
    await expect(
      page.getByText("No summaries match these filters.")
    ).toBeVisible(FIRST_PAINT);

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByLabel("Search summaries")).toHaveValue("");
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
  });

  /**
   * **FR-HOME-04** — "Allow browsing of previous shifts, dates, and other
   * areas." The prototype's date chip (`app-source.txt` 1377) has no handler
   * behind it; this is the real control, and the bounds go to the server.
   */
  test("the date range filters the list (FR-HOME-04)", async ({ page }) => {
    await signInToSummaries(page);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);

    // The seed spans the last week, so a far-future window must empty it.
    await page.getByLabel("From").fill("2099-01-01");
    await expect(
      page.getByText("No summaries match these filters.")
    ).toBeVisible(FIRST_PAINT);

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
  });

  /**
   * **FR-SUM-01** names exactly four sections, and **FR-SUM-06** requires each
   * item to carry its source record id. The prototype hardcodes both
   * (`app-source.txt` 1414–1417); here they come from the payload.
   */
  test("the detail shows the four sections with their source records", async ({
    page,
  }) => {
    await signInToSummaries(page);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await firstSummaryLink(page).click();

    await expect(page.getByRole("heading", { name: "Activities" })).toBeVisible(
      FIRST_PAINT
    );
    await expect(
      page.getByRole("heading", { name: "Critical alarms" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pending actions" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Safety observations" })
    ).toBeVisible();

    // FR-SUM-06's source reference, on the items themselves.
    await expect(page.getByText(/^ELB-\d{8}-\d{4}$/).first()).toBeVisible();
  });

  /**
   * **FR-SUM-09** — the requirement is visible, the capability is not faked.
   * The prototype toasts "exported as PDF" for a file it never produced (1407).
   */
  test("export offers all three formats and enables none", async ({ page }) => {
    await signInToSummaries(page);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await firstSummaryLink(page).click();

    await page.getByRole("button", { name: "Export" }).click();

    for (const format of ["PDF", "Excel", "Word"]) {
      await expect(
        page.getByRole("menuitem", { name: `Export as ${format}` })
      ).toBeDisabled();
    }
  });

  /* ---- FR-SUM-08: comment access is Admin/Super-User controlled ---------- */

  /**
   * The Operator holds `summary:read` and not `summary:comment`, and the
   * `operator_comment_permission` workflow seeds **off** — so the screen says
   * so rather than offering a control that would 403.
   */
  test("commenting is view-only for an Operator by default", async ({
    page,
  }) => {
    await signInToSummaries(page);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await firstSummaryLink(page).click();

    await expect(
      page.getByText(/Commenting is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByLabel("Add a comment")).toHaveCount(0);
  });

  /**
   * A Supervisor holds `summary:comment` outright, so the toggle is irrelevant
   * to them — the predicate is an OR. The prototype's role-name check
   * (`role === 'operator' && !opComment`, 1426) gets this wrong for anyone
   * holding two roles.
   */
  test("a Supervisor may comment without the workflow being enabled", async ({
    page,
  }) => {
    await signInToSummaries(page, SUPERVISOR);
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await firstSummaryLink(page).click();

    await expect(page.getByLabel("Add a comment")).toBeVisible(FIRST_PAINT);
  });

  /* ---- FR-ADM-03: the guard, not the hidden link, is the control --------- */

  test("a Super User cannot reach /summaries by typing the URL", async ({
    page,
  }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    await page.goto("/summaries");

    // `homeForSession` returns the only route this session's permissions open,
    // never a dead-end `/unauthorized`.
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 30_000 });
  });

  test("a Super User cannot reach /dashboard by typing the URL", async ({
    page,
  }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 30_000 });
  });

  test("a Super User is shown neither nav item", async ({ page }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Shift summaries" })
    ).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the dashboard has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signIn(page);
      await landOn(page, /\/dashboard$/);
      await expect(
        page.getByRole("region", { name: "Shift KPIs" })
      ).toBeVisible(FIRST_PAINT);

      // Wide content scrolls inside its own container, never the page
      // (`.claude/rules/01`). The donut is a `viewBox`, not a fixed width.
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the summaries list has no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToSummaries(page);
      await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the summary detail has no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToSummaries(page);
      await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
      await firstSummaryLink(page).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible(
        FIRST_PAINT
      );

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
   * is why the token contrast ratios are computed and recorded in `globals.css`
   * instead. The donut matters here specifically: it draws from `--chart-*`
   * tokens, which have separate dark values.
   */
  test("the dashboard and summaries render under the dark theme", async ({
    page,
  }) => {
    await signIn(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => document.documentElement.classList.add("dark"));

    await landOn(page, /\/dashboard$/);
    await expect(
      page.getByRole("img", { name: "Pending actions by status" })
    ).toBeVisible(FIRST_PAINT);

    await page.goto("/summaries");
    await expect(firstSummaryLink(page)).toBeVisible(FIRST_PAINT);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
