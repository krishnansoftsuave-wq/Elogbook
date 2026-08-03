import { expect, test, type Locator, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * **FR-DASH-04** — personalise mode, as the prototype draws it.
 *
 * ## Why this needs a browser
 *
 * The two things the owner asked for are both *positional*: the controls belong
 * on the **right** of the card's toolbar, and the grip belongs **last**. jsdom
 * has no layout, so a unit test can prove the buttons exist and their order in
 * the DOM, and prove nothing about where they render. These assertions compare
 * measured `x` coordinates, which is the only place that requirement lives.
 *
 * The third assertion is the one that protects a user rather than a layout.
 * ⌃ / ⌄ move buttons were removed because the prototype has none — and **HTML5
 * drag has no keyboard equivalent**, so had the gesture not moved onto the grip,
 * reordering would have become mouse-only (WCAG 2.1.1). `keyboard reorders`
 * below fails if that ever regresses.
 *
 * Super User because that is the only role offered personalisation in this build
 * — an owner decision recorded beside `PersonaliseBar`, departing from
 * FR-DASH-04's "All roles".
 *
 * Requires the mock backend (`npm run dev`), which `playwright.config.ts` starts.
 */

/**
 * ⚠️ **Not `signInAs("Yousuf Al-Rawahi")`, and that is a finding rather than a
 * test convenience.**
 *
 * `ROUTE_PERMISSIONS.DASHBOARD` gates `/dashboard` on `shift:read`, which the
 * Super User role holds none of — its own docblock says so and marks the choice
 * PROVISIONAL. So a real Super User session is redirected off the dashboard to
 * `/admin/users`, and since personalisation is Super-User-only in this build,
 * **the feature is unreachable by the only role entitled to it.** Confirmed by
 * this spec failing on `waitForURL` before it was rewritten.
 *
 * The screen is reached the way the owner reaches it: an Administrator (who
 * holds the wildcard, so the route admits them) switching role in the sidebar.
 * `useRoleVariant` resolves that to `super_user`, so the dashboard renders the
 * Super User's four cards and offers Personalise.
 *
 * That keeps this spec honest about what it proves — the *screen*, not the
 * route policy — and the policy question stays open rather than being closed by
 * a test that quietly worked around it.
 */
const ADMINISTRATOR = "Noura Al-Kindi";

const FIRST_PAINT = { timeout: 30_000 } as const;

const enterPersonalise = async (page: Page) => {
  await signInAs(page, ADMINISTRATOR);
  await page.waitForURL(/\/admin\/users$/, FIRST_PAINT);
  // `FIRST_PAINT` here too: the dev server compiles `/dashboard` on the first
  // request of a run, and that alone outlasted the default 30s budget.
  await page.goto("/dashboard", FIRST_PAINT);

  await page.getByRole("button", { name: /^Switch role/ }).click(FIRST_PAINT);
  await page.getByRole("menuitemradio", { name: /Super User/ }).click();

  await page.getByRole("button", { name: "Personalise" }).click(FIRST_PAINT);
};

/** The toolbar strip above one card, identified by the widget it belongs to. */
const toolbarFor = (page: Page, label: string): Locator =>
  page.getByRole("button", { name: `Reorder ${label}` });

const leftEdgeOf = async (control: Locator): Promise<number> => {
  const box = await control.boundingBox();
  expect(box, "control is not rendered").not.toBeNull();
  return box?.x ?? 0;
};

test.describe("Dashboard personalisation", () => {
  /*
    Each case signs in, navigates and switches role before it asserts anything,
    and the first of them also pays for the dev server's cold compile of
    `/dashboard`. 30s covered the assertions but not the setup.
  */
  test.slow();

  /**
   * The prototype's card header is a `space-between` row with hide, expand and
   * the grip against its **right** edge (app-source.txt 1155–1158). Ours put the
   * grip first, on the left, with the move buttons trailing — the opposite
   * arrangement, which is what the owner flagged.
   */
  test("puts the controls on the right, grip last", async ({ page }) => {
    await enterPersonalise(page);

    const grip = toolbarFor(page, "Active Users");
    await expect(grip).toBeVisible();

    const hide = page.getByRole("button", { name: "Hide Active Users" });
    const expand = page.getByRole("button", { name: "Expand Active Users" });

    const [gripX, hideX, expandX] = await Promise.all([
      leftEdgeOf(grip),
      leftEdgeOf(hide),
      leftEdgeOf(expand),
    ]);

    // Prototype order, left to right: hide, expand, grip.
    expect(hideX).toBeLessThan(expandX);
    expect(expandX).toBeLessThan(gripX);

    /*
      And the whole cluster sits in the right half of its card — the assertion
      that would still fail if the three were correctly ordered but pinned to
      the left, which is exactly the state this replaced.
    */
    const card = page.locator("[draggable='true']").filter({ has: grip });
    const cardBox = await card.boundingBox();
    expect(hideX).toBeGreaterThan(
      (cardBox?.x ?? 0) + (cardBox?.width ?? 0) / 2
    );
  });

  /** The prototype has no ⌃ / ⌄ pair, so neither do we. */
  test("offers no separate move buttons", async ({ page }) => {
    await enterPersonalise(page);

    await expect(toolbarFor(page, "Active Users")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
  });

  /**
   * **The reason the grip had to become a real button.** Drag is mouse-only;
   * without this, removing the move buttons would have taken reordering away
   * from every keyboard and switch user.
   *
   * Asserted on the rendered order of the card headings, not on the request, so
   * it fails if the key moves the data but not the screen.
   */
  test("keyboard reorders a card from the grip", async ({ page }) => {
    await enterPersonalise(page);

    const grip = toolbarFor(page, "Active Users");
    await expect(grip).toBeVisible();

    const labels = () =>
      page
        .locator("[draggable='true']")
        .evaluateAll((cards) =>
          cards.map((card) => card.querySelector("span")?.textContent?.trim())
        );

    const before = await labels();
    expect(before.indexOf("Active Users")).toBeGreaterThan(0);

    await grip.focus();
    await page.keyboard.press("ArrowUp");

    await expect
      .poll(async () => (await labels()).indexOf("Active Users"))
      .toBe(before.indexOf("Active Users") - 1);
  });

  /** Focusing the grip must announce the gesture, or it is undiscoverable. */
  test("names the grip and describes how to use it", async ({ page }) => {
    await enterPersonalise(page);

    const grip = toolbarFor(page, "Active Users");
    const hintId = await grip.getAttribute("aria-describedby");
    expect(hintId).toBeTruthy();

    await expect(page.locator(`#${hintId}`)).toHaveText(
      "Drag to reorder, or press the up and down arrow keys."
    );
  });
});
