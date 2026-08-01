import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * The Administrator's surface, end to end — **FR-ADM-01** (the directory) and
 * §6.4 (the four workflow switches).
 *
 * The headline is the last describe block: enabling the Supervisor Action
 * Workflow makes the owner control that Phases 1 and 2 built actually appear.
 * Every switch seeds **off** (FR-PA-05's own default), so until this screen
 * existed half of what those phases delivered could not be demonstrated.
 *
 * Requires the mock backend (`npm run dev`), which `playwright.config.ts`
 * starts by default.
 */

const ADMINISTRATOR = "Noura Al-Kindi";
/** §6.5 — dashboards, metrics, and comment / decision-workflow access. */
const SUPER_USER = "Yousuf Al-Rawahi";
/** Holds nothing the admin tree asks for. */
const OPERATOR = "Said Al-Busaidi";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const FIRST_PAINT = { timeout: 30_000 } as const;

/**
 * `e2e/accounts.ts` explains why this drives the callback rather than the
 * sidebar switcher — most notably that the switcher does not exist below `lg`,
 * where the `responsive` block runs. `e2e/auth.spec.ts` owns the sign-in chain.
 */
const signIn = (page: Page, displayName = ADMINISTRATOR) =>
  signInAs(page, displayName);

const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

/**
 * Both admin-tree roles land on `/admin/users` — it is the first
 * `HOME_CANDIDATES` entry and the only route Super User's permissions open.
 *
 * Waiting for it before navigating is not decoration: `signIn` finishes at
 * `/auth/callback`, and a `goto` issued while that exchange is in flight aborts
 * it, stores no token, and gets bounced back to login.
 */
const openAt = async (
  page: Page,
  path: string,
  displayName = ADMINISTRATOR
) => {
  await signIn(page, displayName);
  await landOn(page, /\/admin\/users$/);
  if (path !== "/admin/users") await page.goto(path);
};

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/**
 * **Serial, and that is not a style choice.** These tests mutate a store the dev
 * server holds in one process — suspending a user and flipping a workflow are
 * both global. Serial ordering keeps them from racing each other, and every
 * block that changes something puts it back.
 *
 * ⚠️ That protects this file from itself, not from its neighbours.
 * `playwright.config.ts` sets `fullyParallel: true` with default workers
 * locally, so `supervisor.spec.ts` — which asserts the *disabled* state of the
 * very switch the last block here enables — can run concurrently against the
 * same store. Restoring state narrows the window to a second or two but does not
 * close it. The fix is `workers: 1` or `fullyParallel: false`, and that file is
 * guarded, so it is reported rather than changed.
 */
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/v1/dev/reset");
  expect(response.ok()).toBe(true);
});

/* -------------------------------------------------------------------------- */
/* FR-ADM-01 — the directory                                                   */
/* -------------------------------------------------------------------------- */

test.describe("the user directory", () => {
  /**
   * `/admin/users` is where two of five roles land, and until Phase 3a the
   * endpoint behind it did not exist — so the first thing this product ever said
   * to an Administrator was a 404 toast. The absence of an error is the
   * assertion; the table is the positive control.
   */
  test("an Administrator lands on a directory that loads", async ({ page }) => {
    await signIn(page);
    await landOn(page, /\/admin\/users$/);

    await expect(
      page.getByRole("heading", { name: "Users", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
    await expect(page.getByText("Noura Al-Kindi").first()).toBeVisible();
    // The literal toast that used to greet them, asserted by its text rather
    // than by a role — a generic "no alerts" check would pass for any reason.
    await expect(
      page.getByText(/Request failed with status code 404/)
    ).toHaveCount(0);
  });

  /**
   * Roles are derived from AD groups (**FR-AUTH-02**), so both columns are here
   * for the case where the derivation yields nothing: an account in a group this
   * platform does not map is §5's deny path, and the Administrator is the person
   * who has to notice.
   */
  test("shows AD groups, derived roles, and the account that maps to none", async ({
    page,
  }) => {
    await openAt(page, "/admin/users");

    const unmapped = page.getByRole("row", { name: /Hamed Al-Siyabi/ });
    await expect(unmapped).toBeVisible(FIRST_PAINT);
    await expect(unmapped.getByText("OLNG-CONTRACTORS")).toBeVisible();
    await expect(unmapped.getByText("No platform role")).toBeVisible();

    const operator = page.getByRole("row", { name: /Said Al-Busaidi/ });
    await expect(operator.getByText("OLNG-ELOG-OPERATORS")).toBeVisible();
    // `exact`, because the role badge "Operator" is also a substring of the AD
    // group beside it — a loose match resolves to both and fails strict mode.
    await expect(operator.getByText("Operator", { exact: true })).toBeVisible();
  });

  /**
   * **FR-AUTH-03** — "where a user holds multiple roles, grant the highest
   * access with both roles' permissions combined". The directory has to be able
   * to show that, which the old single-role model could not.
   */
  test("shows both roles for someone in two AD groups", async ({ page }) => {
    await openAt(page, "/admin/users");

    const row = page.getByRole("row", { name: /Maryam Al-Zadjali/ });
    await expect(row).toBeVisible(FIRST_PAINT);
    await expect(row.getByText("Operator", { exact: true })).toBeVisible();
    await expect(row.getByText("Management", { exact: true })).toBeVisible();
  });

  /**
   * No Add and no Delete. Identities originate in Active Directory, so an
   * account created here would carry no groups and `resolveSession` could never
   * sign it in — FR-ADM-01's "create / remove" is reported unmet rather than
   * faked with a control that produces an unusable record.
   */
  test("offers no way to create or delete a person", async ({ page }) => {
    await openAt(page, "/admin/users");
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    await expect(page.getByRole("link", { name: /Add user/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Delete /i })).toHaveCount(
      0
    );
    // The header says where accounts do come from, so the missing button reads
    // as the design rather than as a gap.
    await expect(
      page.getByText(/Accounts are created and removed in AD/)
    ).toBeVisible();
  });

  /**
   * FR-ADM-01's one write. Driven against **Hamed Al-Siyabi** on purpose: he is
   * the unmapped account, so no other spec signs in as him and suspending him
   * cannot affect a neighbouring file. Restored at the end regardless.
   */
  test("suspends platform access and restores it again", async ({ page }) => {
    await openAt(page, "/admin/users");

    const row = page.getByRole("row", { name: /Hamed Al-Siyabi/ });
    await expect(row).toBeVisible(FIRST_PAINT);
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Suspend Hamed Al-Siyabi" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible(FIRST_PAINT);
    // The copy names which of the two systems is changing.
    await expect(
      dialog.getByText(/Active Directory account .* untouched/)
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Suspend" }).click();

    await expect(row.getByText("Suspended")).toBeVisible(FIRST_PAINT);

    // Put it back — the store is shared with every other spec file.
    await page
      .getByRole("button", { name: "Restore access for Hamed Al-Siyabi" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Restore access" })
      .click();

    await expect(row.getByText("Active", { exact: true })).toBeVisible(
      FIRST_PAINT
    );
  });

  test("the preview screen shows what AD says and one control", async ({
    page,
  }) => {
    await openAt(page, "/admin/users");
    await page.getByRole("link", { name: "Preview Maryam Al-Zadjali" }).click();

    await landOn(page, /\/admin\/users\/maryam\.alzadjali\/preview$/);
    await expect(
      page.getByRole("heading", { name: "User", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByText("maryam.alzadjali")).toBeVisible();
    await expect(page.getByText("OLNG-ELOG-SUPERINTENDENTS")).toBeVisible();
    await expect(page.getByText("Never signed in")).toBeVisible();
    await expect(
      page.getByText(/Names, groups and roles come from Active Directory/)
    ).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/* FR-ADM-03 — the two admin-tree roles diverge                                */
/* -------------------------------------------------------------------------- */

test.describe("Super User boundaries", () => {
  /** §6.5: *"Can view users."* Reading is not Administrator-only. */
  test("a Super User reaches the directory", async ({ page }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users$/);

    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
    await expect(page.getByText("Said Al-Busaidi")).toBeVisible();
  });

  /**
   * ...and no further. `PATCH /users/:username` takes the wildcard, so offering
   * the control would be offering a click that 403s. Hiding it is the UI half of
   * FR-ADM-03; the handler is the half that enforces it.
   */
  test("a Super User is offered no access control", async ({ page }) => {
    await openAt(page, "/admin/users", SUPER_USER);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    // Positive control: they can still read the row.
    await expect(
      page.getByRole("link", { name: "Preview Said Al-Busaidi" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Suspend / })).toHaveCount(
      0
    );
  });

  /**
   * §6.5's **fourth** bullet — *"Control access to comments and the decision
   * workflow"* — plus **FR-ADM-06**, **FR-DASH-03** and the §4 role table. Two
   * of the four switches are theirs, and this route was briefly gated on the
   * wildcard, which locked them out of a capability the BRD grants four times.
   */
  test("a Super User reaches the workflow switches", async ({ page }) => {
    await openAt(page, "/admin/workflows", SUPER_USER);

    await expect(
      page.getByRole("heading", { name: "Workflows", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByRole("switch")).toHaveCount(4);
  });

  /**
   * ...but only two of them are live. **FR-PA-05** reserves action assignment to
   * the *"Administrator"*, and `predictive_insights` has no requirement at all,
   * so those two are inert **and say why** rather than sitting there looking
   * broken.
   */
  test("a Super User may flip comments and decisions, not assignment", async ({
    page,
  }) => {
    await openAt(page, "/admin/workflows", SUPER_USER);

    const comments = page.getByRole("switch", {
      name: "Operator Comment Permission",
    });
    await expect(comments).toBeVisible(FIRST_PAINT);
    await expect(comments).toBeEnabled();
    await expect(
      page.getByRole("switch", { name: "Management Decision Workflow" })
    ).toBeEnabled();

    await expect(
      page.getByRole("switch", { name: "Supervisor Action Workflow" })
    ).toBeDisabled();
    await expect(
      page.getByRole("switch", { name: "Predictive Insights" })
    ).toBeDisabled();
    await expect(
      page.getByText("Only an Administrator can change this one.")
    ).toHaveCount(2);
  });

  test("a Super User is shown the Workflows nav item", async ({ page }) => {
    await openAt(page, "/admin/users", SUPER_USER);

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible(
      FIRST_PAINT
    );
    await expect(nav.getByRole("link", { name: "Workflows" })).toBeVisible();
    // ...and nothing operational: they hold no `shift:read`.
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  /**
   * An Operator holds neither `user:read` nor `access:control`, so the admin
   * tree is closed to them entirely. A wrong-permission visit goes to **that
   * session's own home**, never to a dead-end error page.
   */
  test("an Operator is bounced out of the admin tree", async ({ page }) => {
    await signIn(page, OPERATOR);
    await landOn(page, /\/dashboard$/);

    await page.goto("/admin/workflows");
    await landOn(page, /\/dashboard$/);
  });
});

/* -------------------------------------------------------------------------- */
/* §6.4 / FR-PA-05 — the switch that unlocks Phases 1 and 2                    */
/* -------------------------------------------------------------------------- */

test.describe("workflow switches", () => {
  test("an Administrator sees four switches, every one of them off", async ({
    page,
  }) => {
    await openAt(page, "/admin/workflows");

    await expect(
      page.getByRole("heading", { name: "Workflows", level: 1 })
    ).toBeVisible(FIRST_PAINT);

    const switches = page.getByRole("switch");
    await expect(switches).toHaveCount(4);
    for (const control of await switches.all()) {
      await expect(control).not.toBeChecked();
    }
  });

  /**
   * **The point of the phase.** FR-PA-05: assignment and tracking exist "only
   * when the Administrator enables the workflow". Before this screen nothing
   * could enable one, so `ActionOwnerControl`'s live branch had never run in a
   * browser.
   *
   * Both directions are asserted, which is also what leaves the store as this
   * file found it.
   */
  test("enabling the Supervisor Action Workflow makes the owner control live", async ({
    page,
  }) => {
    await openAt(page, "/actions/ACT-2041");
    // Off is the seeded state: configuration, not a failure.
    await expect(
      page.getByText(/Assignment is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);

    await page.goto("/admin/workflows");
    const control = page.getByRole("switch", {
      name: "Supervisor Action Workflow",
    });
    await expect(control).toBeVisible(FIRST_PAINT);
    await control.click();

    await expect(
      page.getByText(/Supervisor Action Workflow enabled/)
    ).toBeVisible(FIRST_PAINT);
    await expect(control).toBeChecked();

    // The whole assertion this phase exists for.
    await page.goto("/actions/ACT-2041");
    await expect(page.getByLabel("Assign an owner")).toBeVisible(FIRST_PAINT);
    await expect(
      page.getByText(/Assignment is turned off by your administrator/)
    ).toHaveCount(0);

    // Back off, so the shared store ends where it started.
    await page.goto("/admin/workflows");
    await page
      .getByRole("switch", { name: "Supervisor Action Workflow" })
      .click();
    await expect(
      page.getByText(/Supervisor Action Workflow disabled/)
    ).toBeVisible(FIRST_PAINT);

    await page.goto("/actions/ACT-2041");
    await expect(
      page.getByText(/Assignment is turned off by your administrator/)
    ).toBeVisible(FIRST_PAINT);
  });

  /**
   * `predictive_insights` has no requirement behind it and nothing in the app
   * reads it. Saying so on the card is the difference between an Administrator
   * knowing the switch changes nothing today and assuming it works.
   */
  test("says which switches do not yet change anything", async ({ page }) => {
    await openAt(page, "/admin/workflows");

    await expect(page.getByText(/Nothing reads this switch yet/)).toBeVisible(
      FIRST_PAINT
    );
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the directory has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/admin/users");
      await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

      // The table itself scrolls inside its own container; the page must not.
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the workflow switches have no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/admin/workflows");
      await expect(page.getByRole("switch").first()).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    // Six columns plus a five-control filter bar — the hardest case in the app.
    test(`the audit log has no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/admin/audit");
      await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the shift timings have no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await openAt(page, "/admin/shift-config");
      await expect(page.getByLabel("Day shift start")).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* FR-ADM-05 / §9.3 — the audit trail                                          */
/* -------------------------------------------------------------------------- */

test.describe("audit log", () => {
  test("an Administrator sees the six columns and the seeded history", async ({
    page,
  }) => {
    await openAt(page, "/admin/audit");

    await expect(
      page.getByRole("heading", { name: "Audit log", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    for (const header of ["User", "Role", "Action", "Target", "Result"]) {
      await expect(
        page.getByRole("columnheader", { name: header, exact: true })
      ).toBeVisible();
    }
    /*
      Assert that rows exist, not *which* rows. The seeded seven are long past
      page one by the time this runs: every sign-in now writes a LOGIN and every
      action detail opened writes a VIEW_ACTION, so the log grows with the suite
      — which is the screen behaving correctly. The System row is asserted in
      the filtering test, where it can be found by name.
    */
    await expect(page.getByRole("row").nth(1)).toBeVisible(FIRST_PAINT);
  });

  /**
   * **The assertion this screen exists for.** Sixteen handlers have been writing
   * to this trail since Phase 0a with nothing on the other end to read it —
   * click through the product, come back, and find what you just did.
   */
  test("an action opened moments ago appears in the log", async ({ page }) => {
    await openAt(page, "/actions/ACT-2041");
    await expect(
      page.getByRole("heading", { name: /XV-118/, level: 1 })
    ).toBeVisible(FIRST_PAINT);

    await page.goto("/admin/audit");
    const row = page.getByRole("row", { name: /VIEW_ACTION/ }).first();
    await expect(row).toBeVisible(FIRST_PAINT);
    await expect(row).toContainText("ACT-2041");
    await expect(row).toContainText("Noura Al-Kindi");
  });

  test("filtering by action narrows the rows", async ({ page }) => {
    await openAt(page, "/admin/audit");
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    await page.getByLabel("Filter by action").click();
    await page.getByRole("option", { name: "RETENTION_PURGE" }).click();

    const row = page.getByRole("row", { name: /RETENTION_PURGE/ });
    await expect(row).toBeVisible(FIRST_PAINT);
    // The prototype's `System | —` row, which is why `actor` is nullable.
    await expect(row).toContainText("System");
    // ...and nothing else, which is what proves the filter narrowed the rows
    // rather than merely re-rendered them.
    await expect(page.getByRole("row", { name: /LOGIN/ })).toHaveCount(0);
  });

  /**
   * **FR-ADM-05 and §9.3 both name sign-ins first**, and nothing emitted `LOGIN`
   * before Phase 3b. `hamed.alsiyabi` is in Active Directory and entitled to
   * nothing, so signing in as him is §5's deny path — and the row it leaves is
   * the only `failure` this build can produce, which is what a security reviewer
   * opens an audit log to find.
   */
  test("a refused sign-in leaves a failure row", async ({ page }) => {
    await signIn(page, "Hamed Al-Siyabi");

    /*
      Wait for the refusal to actually land. `CallbackExchange` defers the
      exchange by a task and the request takes a moment, so navigating away on a
      "we are not on the dashboard" check raced it — the component unmounted and
      cancelled the request before `/dev/token` was ever called, and no audit row
      was written for the test to find. The rendered error is the proof the
      exchange completed.
    */
    await expect(
      page.getByRole("alert").getByText(/OLNG-CONTRACTORS/)
    ).toBeVisible(FIRST_PAINT);

    await openAt(page, "/admin/audit");
    /*
      Found by filtering, not by scanning page one. Every sign-in this suite
      performs writes its own LOGIN row, so by the time this runs the refusal is
      several pages deep — which is the log working, not a thing to design
      around.
    */
    await page.getByLabel("Filter by user").click();
    await page.getByRole("option", { name: "Hamed Al-Siyabi" }).click();

    const row = page.getByRole("row", { name: /Hamed Al-Siyabi/ }).first();
    await expect(row).toBeVisible(FIRST_PAINT);
    await expect(row).toContainText("LOGIN");
    await expect(row).toContainText("Failure");
    await expect(row).toContainText("OLNG-CONTRACTORS");
  });

  test("a Super User is bounced from the audit log", async ({ page }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users$/);

    await page.goto("/admin/audit");
    await landOn(page, /\/admin\/users$/);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
  });
});

/* -------------------------------------------------------------------------- */
/* FR-HOME-03 — shift timings                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The banner shows whichever half of the day is live, so an assertion naming
 * one of them passes for twelve hours and fails for the other twelve. Both
 * orderings of a boundary pair are accepted; what is asserted is the boundary.
 */
const bannerShowsBoundary = (open: string, close: string) =>
  new RegExp(`(${open} GST–${close} GST)|(${close} GST–${open} GST)`);

test.describe("shift timings", () => {
  /**
   * **The defect this phase fixed.** `currentShift()` computed 06:00 **UTC** and
   * the banner formats in `Asia/Muscat`, so the dashboard read "10:00–22:00 GST"
   * against FR-HOME-03's "06:00–18:00" for three phases.
   */
  test("the dashboard banner reads the plant's clock, not UTC", async ({
    page,
  }) => {
    await openAt(page, "/dashboard");

    await expect(
      page.getByText(bannerShowsBoundary("06:00", "18:00"))
    ).toBeVisible(FIRST_PAINT);
    // The values the UTC arithmetic produced, named so a regression is obvious.
    await expect(page.getByText(/10:00 GST|22:00 GST/)).toHaveCount(0);
  });

  /**
   * **FR-HOME-03** — "The Administrator can change shift timings, and
   * report/summary generation aligns to them." The value was stored and ignored
   * until this phase, so this is the assertion that the wiring exists. Restored
   * at the end, because the store is shared with every other spec file.
   */
  test("saving a new start hour moves the dashboard banner", async ({
    page,
  }) => {
    await openAt(page, "/admin/shift-config");

    const start = page.getByLabel("Day shift start");
    await expect(start).toBeVisible(FIRST_PAINT);
    await expect(start).toHaveValue("06:00");
    // The three derived boundaries, shown before anything is committed.
    await expect(page.getByText("18:00").first()).toBeVisible();

    await start.fill("07:00");
    await expect(page.getByText("19:00").first()).toBeVisible();
    await page.getByRole("button", { name: "Save shift timings" }).click();
    await expect(page.getByText(/Shift timings saved/)).toBeVisible(
      FIRST_PAINT
    );

    await page.goto("/dashboard");
    await expect(
      page.getByText(bannerShowsBoundary("07:00", "19:00"))
    ).toBeVisible(FIRST_PAINT);

    // Put it back.
    await page.goto("/admin/shift-config");
    await page.getByLabel("Day shift start").fill("06:00");
    await page.getByRole("button", { name: "Save shift timings" }).click();
    await expect(page.getByText(/Shift timings saved/)).toBeVisible(
      FIRST_PAINT
    );

    await page.goto("/dashboard");
    await expect(
      page.getByText(bannerShowsBoundary("06:00", "18:00"))
    ).toBeVisible(FIRST_PAINT);
  });

  test("a Super User is bounced from the shift timings", async ({ page }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users$/);

    await page.goto("/admin/shift-config");
    await landOn(page, /\/admin\/users$/);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
  });
});

/* -------------------------------------------------------------------------- */
/* Dark mode                                                                   */
/* -------------------------------------------------------------------------- */

test.describe("dark mode", () => {
  test("the admin screens render under the dark theme", async ({ page }) => {
    await signIn(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await landOn(page, /\/admin\/users$/);

    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    await page.goto("/admin/workflows");
    await expect(page.getByRole("switch").first()).toBeVisible(FIRST_PAINT);

    await page.goto("/admin/audit");
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);

    await page.goto("/admin/shift-config");
    await expect(page.getByLabel("Day shift start")).toBeVisible(FIRST_PAINT);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
