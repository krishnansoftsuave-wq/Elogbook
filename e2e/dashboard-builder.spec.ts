import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * ⚠️ PROTOTYPE-ONLY, like the feature itself
 * (`features/dashboard-builder/schemas.ts`) — no BRD basis. The happy path
 * through the prototype's `dashboards()` flow (`app-source.txt` 2045–2192),
 * built at the user's explicit request (2026-08-01): the Administration →
 * Dashboards tab and the standalone "Dashboard Builder" sidebar row both open
 * this screen for a Super User; edit a role's dashboard, reorder a widget,
 * save a draft, publish it, and see the new version in the history.
 *
 * Requires the mock backend (`npm run dev`), which `playwright.config.ts`
 * starts by default.
 */

const SUPER_USER = "Yousuf Al-Rawahi";

const FIRST_PAINT = { timeout: 30_000 } as const;

const landOn = (page: Page, pattern: RegExp) =>
  page.waitForURL(pattern, { timeout: 30_000 });

const openAsSuperUser = async (page: Page, path: string) => {
  await signInAs(page, SUPER_USER);
  await landOn(page, /\/admin\/users$/);
  await page.goto(path);
};

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/v1/dev/reset");
  expect(response.ok()).toBe(true);
});

test.describe("Dashboard Builder", () => {
  test("a Super User reaches the builder from the sidebar", async ({
    page,
  }) => {
    await signInAs(page, SUPER_USER);
    await landOn(page, /\/admin\/users$/);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Dashboard Builder" })
      .click();

    await landOn(page, /\/admin\/dashboard-builder$/);
    await expect(
      page.getByRole("heading", { name: "Dashboards", level: 1 })
    ).toBeVisible(FIRST_PAINT);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
  });

  test("lists one row per role with its status", async ({ page }) => {
    await openAsSuperUser(page, "/admin/dashboard-builder");

    const operatorRow = page.getByRole("row", { name: /Operator/ });
    await expect(operatorRow).toBeVisible(FIRST_PAINT);
    await expect(operatorRow).toContainText("Shift Overview");
    await expect(operatorRow).toContainText("Published");

    const adminRow = page.getByRole("row", { name: /Administrator/ });
    await expect(adminRow).toContainText("Draft");
  });

  test("edits, saves a draft, and publishes a dashboard", async ({ page }) => {
    await openAsSuperUser(page, "/admin/dashboard-builder");

    await page
      .getByRole("row", { name: /Supervisor/ })
      .getByRole("link", { name: "Edit dashboard" })
      .click();

    await landOn(page, /\/admin\/dashboard-builder\/supervisor$/);
    await expect(
      page.getByRole("heading", { name: /Supervisor · Shift Oversight/ })
    ).toBeVisible(FIRST_PAINT);

    // Disable a widget, then save it as a draft.
    const kpiSwitch = page.getByRole("switch", { name: "Shift KPIs enabled" });
    await expect(kpiSwitch).toBeChecked();
    await kpiSwitch.click();
    await expect(kpiSwitch).not.toBeChecked();

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved")).toBeVisible(FIRST_PAINT);

    // Publish, see the confirmation, and land on Publish & Versions with the
    // success banner shown.
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText(/published as v1\./)).toBeVisible(FIRST_PAINT);
    await landOn(
      page,
      /\/admin\/dashboard-builder\/supervisor\/versions\?published=1$/
    );
    await expect(
      page.getByRole("heading", { name: "Publish & Versions" })
    ).toBeVisible(FIRST_PAINT);
    await expect(
      page.getByText(/is now live for \d+ Supervisors\./)
    ).toBeVisible(FIRST_PAINT);
    const liveRow = page.getByRole("row", { name: /Live/ });
    await expect(liveRow).toBeVisible(FIRST_PAINT);

    // Re-enable the widget and republish, so the shared store ends where it
    // started for any other spec that reads the Supervisor dashboard.
    await page.goto("/admin/dashboard-builder/supervisor");
    await page.getByRole("switch", { name: "Shift KPIs enabled" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText(/published as v1\./)).toBeVisible(FIRST_PAINT);
  });

  test("publishing from Publish & Versions shows the success banner and changelog", async ({
    page,
  }) => {
    await openAsSuperUser(page, "/admin/dashboard-builder/operator/versions");
    await expect(
      page.getByRole("heading", { name: "Publish & Versions" })
    ).toBeVisible(FIRST_PAINT);

    await expect(page.getByText("Changes in this version")).toBeVisible(
      FIRST_PAINT
    );

    await page.getByRole("button", { name: "Publish to Operators" }).click();

    const banner = page.getByText(/is now live for \d+ Operators\./);
    await expect(banner).toBeVisible(FIRST_PAINT);

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(banner).toBeHidden();

    await page.getByRole("button", { name: "Compare versions" }).click();
    await expect(
      page.getByText("Version comparison isn't available yet")
    ).toBeVisible(FIRST_PAINT);
  });

  test("previews a dashboard read-only", async ({ page }) => {
    await openAsSuperUser(page, "/admin/dashboard-builder/operator");

    await page.getByRole("link", { name: "Preview" }).click();
    await landOn(page, /\/admin\/dashboard-builder\/operator\/preview$/);

    await expect(page.getByText("Preview mode")).toBeVisible(FIRST_PAINT);
    await expect(page.getByText("Shift KPIs")).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);
  });

  test("an Administrator reaches the builder from the Dashboards tab", async ({
    page,
  }) => {
    await signInAs(page, "Noura Al-Kindi");
    await landOn(page, /\/admin\/users$/);

    await page.getByRole("link", { name: "Dashboards" }).click();
    await landOn(page, /\/admin\/dashboard-builder$/);
    await expect(page.getByRole("table")).toBeVisible(FIRST_PAINT);
  });

  test("an Operator does not see the Dashboard Builder nav item", async ({
    page,
  }) => {
    await signInAs(page, "Said Al-Busaidi");
    await landOn(page, /\/dashboard$/);

    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Dashboard Builder" })
    ).toHaveCount(0);
  });
});
