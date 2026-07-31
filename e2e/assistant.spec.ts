import { expect, test, type Page } from "@playwright/test";

/**
 * The bilingual assistant, end to end — §7.4.
 *
 * The answer is [BACKEND]; what runs here is the canned mock behind the real
 * contract (`src/mocks/data/assistant.ts`). So these assert the *screen*: that a
 * question reaches the endpoint, that citations click through, that a
 * low-confidence answer says so, and that feedback is captured.
 *
 * Requires the mock backend, which means `npm run dev` —
 * `playwright.config.ts` starts it by default.
 */

const SSO_BUTTON = "Sign in with Oman LNG Account";
const OPERATOR = "Said Al-Busaidi";
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

const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

const FIRST_PAINT = { timeout: 30_000 } as const;

/**
 * Waiting for the dashboard before navigating is not decoration: `signIn`
 * finishes at `/auth/callback`, and a `goto` issued while that exchange is in
 * flight aborts it, stores no token, and gets bounced to login.
 */
const signInToAssistant = async (page: Page, displayName = OPERATOR) => {
  await signIn(page, displayName);
  await landOn(page, /\/dashboard$/);
  await page.goto("/assistant");
};

const ask = async (page: Page, question: string) => {
  await page.getByLabel("Ask the assistant").fill(question);
  await page.getByRole("button", { name: "Send question" }).click();
};

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

test.describe("ask assistant", () => {
  test("reaches the assistant from the sidebar", async ({ page }) => {
    await signIn(page);
    await landOn(page, /\/dashboard$/);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Ask Assistant" })
      .click();

    await landOn(page, /\/assistant$/);
    await expect(
      page.getByRole("heading", { name: "Ask Assistant", level: 1 })
    ).toBeVisible(FIRST_PAINT);
  });

  test("starts with no conversation rather than a fabricated one", async ({
    page,
  }) => {
    await signInToAssistant(page);

    await expect(page.getByText("No questions yet")).toBeVisible(FIRST_PAINT);
  });

  /**
   * The seeded canned answer keyed on "compressor" — `mocks/data/assistant.ts`
   * matches `b-train`/`compressor`/`trip` at confidence 92.
   */
  test("answers a question and cites its sources", async ({ page }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await ask(page, "What happened on B-train during the compressor trip?");

    await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);
    // FR-AI-03's proof line: record id · shift date · GST timestamp.
    await expect(
      page.getByText(/· \d{2} \w{3} \d{4} · \d{2}:\d{2} GST/).first()
    ).toBeVisible();
  });

  /**
   * **FR-AI-03** — "with click-through to the original entry." The action
   * citation resolves because Phase 1a built `/actions/:id`.
   */
  test("a citation clicks through to the action it names", async ({ page }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await ask(page, "Tell me about the compressor trip on B-train");
    await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);

    await page
      .getByRole("link", { name: /XV-118|ACT-2041/ })
      .first()
      .click();

    await landOn(page, /\/actions\/ACT-/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(
      FIRST_PAINT
    );
  });

  /**
   * **FR-AI-05** — "State clearly when confidence is low rather than risk an
   * incorrect answer." The mock's FALLBACK answers at confidence 24 when nothing
   * matches, which is below the seeded threshold of 60.
   */
  test("says so when the answer is low-confidence", async ({ page }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await ask(page, "zzzz nothing in the logs matches this question");

    await expect(
      page.getByText(/Confidence in this answer is low/)
    ).toBeVisible(FIRST_PAINT);
  });

  /** **FR-FB-01** — thumbs up/down with an optional comment. */
  test("captures a thumbs-up on an answer", async ({ page }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await ask(page, "What happened on B-train?");
    await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);

    await page
      .getByRole("button", { name: "Rate this answer helpful" })
      .click();

    await expect(page.getByText(/your feedback was recorded/)).toBeVisible(
      FIRST_PAINT
    );
  });

  test("asks what was wrong after a thumbs-down", async ({ page }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await ask(page, "What happened on B-train?");
    await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);

    await page
      .getByRole("button", { name: "Rate this answer not helpful" })
      .click();

    await expect(
      page.getByLabel("What was wrong with this answer?")
    ).toBeVisible(FIRST_PAINT);
  });

  /** **FR-AI-06** — the user's own filters, not a scope imposed on them. */
  test("offers the five FR-AI-06 filters, collapsed by default", async ({
    page,
  }) => {
    await signInToAssistant(page);
    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);

    await expect(page.getByLabel("Equipment")).toBeHidden();

    await page.getByRole("button", { name: "Filters" }).click();

    for (const label of ["Equipment", "Area", "Author", "From", "To"]) {
      // `exact`: Playwright's `getByLabel` is a case-insensitive *substring*
      // match, so a bare "To" also matches the mic button's "speech-to-text"
      // label and resolves to four elements.
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
  });

  /**
   * **FR-AI-01** confirms voice input; **NFR-05** forbids the egress that
   * browser-native speech recognition requires, and `Permissions-Policy`
   * disables the microphone. The control is present and disabled rather than
   * silently absent or, worse, present and broken.
   */
  test("shows the voice control disabled, with the reason", async ({
    page,
  }) => {
    await signInToAssistant(page);

    const mic = page.getByRole("button", {
      name: /Voice input needs an on-premises speech-to-text service/,
    });
    await expect(mic).toBeVisible(FIRST_PAINT);
    await expect(mic).toBeDisabled();
  });

  /* ---- FR-ADM-03: the guard, not the hidden link, is the control --------- */

  test("a Super User cannot reach /assistant by typing the URL", async ({
    page,
  }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    await page.goto("/assistant");

    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 30_000 });
  });

  test("a Super User is not shown the assistant nav item", async ({ page }) => {
    await signIn(page, SUPER_USER);
    await landOn(page, /\/admin\/users/);

    // A positive control first. `landOn` waits on the URL only, so an absence
    // assertion alone is satisfied before the client `Sidebar` hydrates — it
    // would pass with `NAV_ITEMS` deleted entirely. Waiting for the one link
    // this session *does* have proves the nav rendered before asserting what it
    // left out.
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible(
      FIRST_PAINT
    );

    await expect(nav.getByRole("link", { name: "Ask Assistant" })).toHaveCount(
      0
    );
  });
});

/* -------------------------------------------------------------------------- */
/* NFR-08 — 375 / 768 / 1440                                                   */
/* -------------------------------------------------------------------------- */

test.describe("responsive", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the assistant has no horizontal page scroll at ${breakpoint.name} (${breakpoint.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToAssistant(page);
      await expect(page.getByLabel("Ask the assistant")).toBeVisible(
        FIRST_PAINT
      );

      await ask(page, "What happened on B-train?");
      await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the filter row has no horizontal page scroll at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await signInToAssistant(page);
      await expect(page.getByLabel("Ask the assistant")).toBeVisible(
        FIRST_PAINT
      );

      await page.getByRole("button", { name: "Filters" }).click();
      await expect(page.getByLabel("Equipment")).toBeVisible();

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Dark mode                                                                   */
/* -------------------------------------------------------------------------- */

test.describe("dark mode", () => {
  test("the assistant renders under the dark theme", async ({ page }) => {
    await signIn(page);
    await page.emulateMedia({ colorScheme: "dark" });

    await landOn(page, /\/dashboard$/);
    await page.goto("/assistant");

    await expect(page.getByLabel("Ask the assistant")).toBeVisible(FIRST_PAINT);
    await ask(page, "What happened on B-train?");
    await expect(page.getByText("Sources")).toBeVisible(FIRST_PAINT);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
