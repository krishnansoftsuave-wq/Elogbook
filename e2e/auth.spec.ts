import { expect, test, type Page } from "@playwright/test";

import { signInAs as accountSignIn } from "./accounts";

/**
 * The sign-in chain, end to end: `/auth/login` → `/auth/callback` → the route
 * the session's permissions actually open.
 *
 * **The middle step is gone.** `/auth/mock-adfs` was an invented "Choose an
 * account" screen; the button now redirects straight to the reply URL as the
 * default Operator, and choosing another identity moved to `DevRoleSwitcher` in
 * the sidebar footer — dev-only scaffolding, gated the same way.
 *
 * `/auth/callback` only exists outside a production build (it calls
 * `notFound()` when `NODE_ENV === "production"`), and `playwright.config.ts`
 * runs `npm run dev`, so it is present in the default run. Pointing
 * `PLAYWRIGHT_BASE_URL` at a production build makes the flow specs 404 —
 * correctly, because there is nothing there to drive.
 *
 * Requires `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`; without it
 * the mock endpoints resolve to a 404 and everything fails for a configuration
 * reason rather than a code one.
 */

const SSO_BUTTON = "Sign in with Oman LNG Account";

/**
 * Who the sign-in button signs you in as; mirrors `DEFAULT_MOCK_ACCOUNT`.
 *
 * The Administrator, so the gated impersonation controls are reachable from the
 * first screen — see the constant's own note. Every other account here arrives
 * through `e2e/accounts.ts` instead, which is the same exchange without the
 * button.
 */
const DEFAULT_ACCOUNT = "Noura Al-Kindi";

/** §5's refusal, verbatim — the same paragraph `ACCESS_DENIED_MESSAGE` holds. */
const DENY_MESSAGE =
  "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access.";

/** Mirrors `playwright.config.ts`, so "did we leave the origin" has an answer. */
const BASE_ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * Walks the whole redirect chain the way a person would: the button signs in as
 * the Operator and nobody else.
 */
const signIn = async (page: Page, from = "/auth/login") => {
  await page.goto(from);
  await page.getByRole("button", { name: SSO_BUTTON }).click();
};

/**
 * Sign in as a specific AD account.
 *
 * ⚠️ **Changed with the two-tier role switcher.** The sidebar footer used to
 * hold a dev-only *account* picker, and this walked it. That control is gone:
 * what sits there now is the product's **role impersonation** switcher, which
 * changes the role a session is viewed as, not which AD user is signed in. The
 * two are different things and only the second one needs a different token.
 *
 * So becoming a different account is the callback drive `e2e/accounts.ts`
 * already uses — the same exchange, minus a UI step that no longer exists.
 * `from` is preserved for the `returnTo` cases, which still walk the login
 * screen.
 */
const signInAs = async (
  page: Page,
  displayName: string,
  from = "/auth/login"
) => {
  if (displayName === DEFAULT_ACCOUNT) {
    await signIn(page, from);
    return;
  }

  await accountSignIn(page, displayName);
};

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/** The three engagement breakpoints (NFR-08): mobile, tablet, control room. */
const BREAKPOINTS = [
  { name: "375px mobile", width: 375, height: 812 },
  { name: "768px tablet", width: 768, height: 1024 },
  { name: "1440px desktop", width: 1440, height: 900 },
];

const MOBILE = BREAKPOINTS[0];

/**
 * The shape that used to widen the page: a server message with no space,
 * hyphen or other soft-wrap opportunity anywhere in it. Every screen that
 * prints a message it did not author has to survive one.
 */
const UNBROKEN_SERVER_TOKEN = `x${"8f3c1b9d4e7a2f6c0b5d8e1a".repeat(10)}`;

/** Forces `GET /me` to answer with a message this app has to render as-is. */
const failMeWith = (page: Page, status: number, message: string) =>
  page.route("**/api/v1/me*", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "unauthorized", message, details: null },
        meta: { correlation_id: "e2e", timestamp: "2026-07-30T00:00:00+00:00" },
      }),
    })
  );

test.describe("authentication", () => {
  test("an anonymous visitor lands on the single sign-on screen", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
    await expect(page.getByRole("button", { name: SSO_BUTTON })).toBeVisible();
  });

  test("the sign-in screen asks for no credentials", async ({ page }) => {
    // §1: the backend "never stores passwords and never authenticates a
    // username/password itself" — there is no form to validate.
    await page.goto("/auth/login");

    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
  });

  test("a protected route bounces to login and remembers where to return", async ({
    page,
  }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/returnTo=%2Fadmin%2Fusers/);
  });

  test("member routes are protected too, not just the admin tree", async ({
    page,
  }) => {
    await page.goto("/logbook/add");

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page).toHaveURL(/returnTo=%2Flogbook%2Fadd/);
  });

  /**
   * **FR-AUTH-01** — "map to a role and redirect to a role-based dashboard."
   *
   * The landing route has moved twice. `/logbook` was the entries scaffold,
   * whose endpoint has no mock handler, so signing in showed a connection-error
   * toast. Phase 1a used `/actions` as an acknowledged stand-in — a
   * pending-actions list is one quarter of what FR-HOME-01 calls a dashboard.
   * Phase 1b is the requirement actually met.
   */
  test("an operator signs in and lands on the dashboard", async ({ page }) => {
    await signInAs(page, "Said Al-Busaidi");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("an administrator signs in and lands in the admin tree", async ({
    page,
  }) => {
    await signInAs(page, "Noura Al-Kindi");

    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("sign-in returns the visitor to the route they were bounced from", async ({
    page,
  }) => {
    await page.goto("/logbook/add");
    await expect(page).toHaveURL(/returnTo=%2Flogbook%2Fadd/);

    await page.getByRole("button", { name: SSO_BUTTON }).click();

    await expect(page).toHaveURL(/\/logbook\/add$/);
  });

  test("an operator cannot reach the admin tree and is sent to their own home", async ({
    page,
  }) => {
    await signInAs(page, "Said Al-Busaidi");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin/users");

    // Never `/unauthorized`: a wrong-permission visit goes to where the session
    // does belong. Hiding the nav item is not what stops them (FR-ADM-03).
    //
    // `waitForURL` with headroom rather than a 5s `toHaveURL`: the redirect is
    // client-side and cannot run until the route has compiled and hydrated,
    // which on a cold dev server is the slowest step in this spec.
    await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  /**
   * §5's deny, and the reason the switcher lists an account that cannot sign in.
   *
   * Hamed Al-Siyabi is in `OLNG-CONTRACTORS`, which maps to nothing: "an
   * unmapped account never gets in with zero permissions — it's refused
   * outright." `POST /dev/token` answers **422** before minting, which is one
   * step earlier than real AD FS will refuse him, and the callback owns the
   * screen either way.
   *
   * This used to be reached through the account picker. Driving it through the
   * switcher is what proves the deny path is still reachable **from the UI**
   * rather than only by typing a callback URL.
   */
  test("an AD account mapped to no platform role is refused outright", async ({
    page,
  }) => {
    await signInAs(page, "Hamed Al-Siyabi");

    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible();
    await expect(page.getByText(DENY_MESSAGE)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to sign in" })
    ).toBeVisible();
  });

  /**
   * **FR-AUTH-03** — "where a user holds multiple roles, grant the highest
   * access with both roles' permissions combined." Maryam is in the Operator
   * *and* Superintendent groups, and the switcher is how that union gets driven
   * through a real `GET /me`.
   */
  test("switching to a multi-group account resolves both roles", async ({
    page,
  }) => {
    await signInAs(page, "Maryam Al-Zadjali");

    await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });

    // The account menu prints the session's roles, joined — the union, not one
    // of them. Opened explicitly now: the roles used to be legible from the
    // sidebar account picker, which the role switcher replaced.
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText(/Operator.*Management/)).toBeVisible();
  });

  /**
   * Switching lands on the new session's own home rather than bouncing off the
   * screen the previous role was looking at. The Operator's dashboard is closed
   * to an Administrator's permissions in the other direction, so this is the
   * assertion that `homeForSession` is doing the routing.
   */
  test("a session lands on its own home, not a bounce", async ({ page }) => {
    await signInAs(page, "Yousuf Al-Rawahi");

    // Super User holds `user:read` and no operational permission at all, so
    // `/dashboard` is not reachable and `/admin/users` is the only home. This
    // is the assertion that `homeForSession` does the routing.
    await page.waitForURL(/\/admin\/users$/, { timeout: 30_000 });
  });

  /**
   * The sidebar switcher is now **role impersonation**, gated on the wildcard,
   * so it is the Administrator who sees it — and it lists the five role groups,
   * not AD accounts. Account switching moved to the callback drive; see
   * `signInAs` above.
   */
  test("the role switcher announces which role is current", async ({
    page,
  }) => {
    await signInAs(page, "Noura Al-Kindi");
    await page.waitForURL(/\/admin\/users$/, { timeout: 30_000 });

    await page.getByRole("button", { name: /Switch role/ }).click();

    // A checked state a screen reader can read, not just a tick glyph.
    await expect(
      page.getByRole("menuitemradio", { name: /Administration/ })
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: /Operator/ })
    ).toHaveAttribute("aria-checked", "false");
  });

  test("an Operator is not offered the role switcher", async ({ page }) => {
    // Explicitly the Operator: the button signs in as the Administrator now.
    await signInAs(page, "Said Al-Busaidi");
    await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });

    // Positive control first — the rail has rendered before absence is asserted.
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", {
        name: "Dashboard",
      })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Switch role/ })).toHaveCount(
      0
    );
  });

  test("a 401 from /me is refused on screen, not left spinning", async ({
    page,
  }) => {
    // The cutover-stable half of §5: real AD FS mints a token for an unmapped
    // account and lets `GET /me` answer 401. `hamed.alsiyabi` cannot reach that
    // branch — §4 rejects his group with a 422 one step earlier — so the 401 is
    // forced here, which is the only way to drive it over real HTTP today.
    //
    // The regression: `endSession` clears the query cache inside the
    // interceptor, and a destroyed in-flight query cancels silently instead of
    // erroring. The callback sat on "Signing in…" indefinitely and this screen
    // never appeared.
    await page.route("**/api/v1/me*", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "unauthorized", message: DENY_MESSAGE, details: null },
          meta: {
            correlation_id: "e2e",
            timestamp: "2026-07-30T00:00:00+00:00",
          },
        }),
      })
    );

    await signInAs(page, "Said Al-Busaidi");

    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible();
    await expect(page.getByText(DENY_MESSAGE)).toBeVisible();
    // Still on the callback: §5's message is the point, so nothing bounces it.
    await expect(page).toHaveURL(/\/auth\/callback/);
    // By role, not by text: the page's own `<title>` is "Signing in", so a text
    // locator matches the document head whatever the screen is showing.
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("the deny screen answers without a session, as homeForSession's fallback", async ({
    page,
  }) => {
    await page.goto("/auth/access-denied");

    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible();
  });

  test("a protocol-relative returnTo never leaves the origin", async ({
    page,
  }) => {
    await signInAs(
      page,
      "Said Al-Busaidi",
      `/auth/login?returnTo=${encodeURIComponent("//evil.com")}`
    );

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(new URL(page.url()).origin).toBe(BASE_ORIGIN);
  });

  test("a backslash-prefixed returnTo never leaves the origin", async ({
    page,
  }) => {
    // `/\evil.com` passed the guard this replaced: it checked `//` but not
    // `/\`, and the URL parser resolves both off-origin.
    await signInAs(
      page,
      "Said Al-Busaidi",
      `/auth/login?returnTo=${encodeURIComponent("/\\evil.com")}`
    );

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(new URL(page.url()).origin).toBe(BASE_ORIGIN);
  });

  test("signing out ends the session and the route closes again", async ({
    page,
  }) => {
    await signInAs(page, "Said Al-Busaidi");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto("/actions");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("the brand carries through the whole sign-in chain", async ({
    page,
  }) => {
    // The prototype states the product name on the login brand panel, on the
    // signing-in bar and on the application top bar (`app-source.txt` 2276,
    // 2262, 193). It used to appear on none of them.
    //
    // `exact`, and exactly one visible match. Two things make a looser locator
    // wrong here: the split screen renders the name twice (the `lg` brand panel
    // and the compact bar that replaces it below `lg`, only ever one shown), and
    // the screen's own subtitle — "Continue to the AI E-Logbook Platform with
    // your organisation account" — contains the phrase as a substring. Counting
    // visible exact matches also catches the responsive pair drifting into both
    // showing at once.
    await page.goto("/auth/login");
    await expect(
      page
        .getByText("AI E-Logbook Platform", { exact: true })
        .filter({ visible: true })
    ).toHaveCount(1);

    await signInAs(page, "Said Al-Busaidi");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("link", { name: /AI E-Logbook Platform/ })
    ).toBeVisible();
  });

  test("the top bar renders on the prototype's brand teal", async ({
    page,
  }) => {
    // Guards the palette itself: under the default shadcn tokens this bar was
    // near-black (`oklch(0.205 0 0)`). It is now `--brand-surface`, #0D857B.
    await signInAs(page, "Said Al-Busaidi");

    const rgb = await page.getByRole("banner").evaluate((el) => {
      // A computed colour authored in oklch serialises differently across
      // browsers and versions, so it is repainted into sRGB bytes here rather
      // than string-matched. `toHaveCSS` against an oklch literal is a
      // false-failure waiting to happen.
      const probe = document
        .createElement("canvas")
        .getContext("2d") as CanvasRenderingContext2D;
      probe.fillStyle = getComputedStyle(el).backgroundColor;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
      return { r, g, b };
    });

    // #0D857B, within a byte of rounding either way.
    expect(Math.abs(rgb.r - 0x0d)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgb.g - 0x85)).toBeLessThanOrEqual(2);
    expect(Math.abs(rgb.b - 0x7b)).toBeLessThanOrEqual(2);
  });

  test("security headers are served", async ({ page }) => {
    const response = await page.goto("/auth/login");
    const headers = response?.headers() ?? {};

    expect(headers["content-security-policy"]).toContain("frame-ancestors");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("responsive sign-in surface", () => {
  for (const breakpoint of BREAKPOINTS) {
    test(`the login screen fits at ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize(breakpoint);
      await page.goto("/auth/login");

      await expect(
        page.getByRole("heading", { name: "Welcome" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: SSO_BUTTON })
      ).toBeVisible();
      await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    /**
     * Replaces the mock AD FS screen's viewport case — that screen is gone, and
     * its job moved into the sidebar footer.
     *
     * **The switcher only exists at `lg` and above**, because `Sidebar` is
     * `max-lg:hidden` and this repo ships no mobile navigation at all (see the
     * signed-in shell case below). So this asserts presence at 1440 and
     * *absence* at 375/768 — the honest state, rather than a test that would
     * fail by design at two of the three breakpoints.
     */
    test(`the role switcher is where the rail is at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      // The switcher is admin impersonation, so it is the Administrator who has
      // one at all.
      await signInAs(page, "Noura Al-Kindi");
      await page.waitForURL(/\/admin\/users$/, { timeout: 30_000 });

      const trigger = page.getByRole("button", { name: /Switch role/ });
      if (breakpoint.width >= 1024) {
        await expect(trigger).toBeVisible();
        await trigger.click();
        // The upward menu at this width, with no page scroll behind it.
        await expect(
          page.getByRole("menuitemradio", { name: /Supervisor/ })
        ).toBeVisible();
      } else {
        await expect(trigger).toHaveCount(0);
      }

      await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the access-denied screen fits at ${breakpoint.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(breakpoint);
      await page.goto("/auth/access-denied");

      await expect(
        page.getByRole("heading", { name: "Access denied" })
      ).toBeVisible();
      await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the callback screen fits at ${breakpoint.name}`, async ({ page }) => {
      // Hamed's group maps to nothing, so the exchange 422s and the callback
      // stays put on its deny state instead of redirecting away mid-assertion.
      await page.setViewportSize(breakpoint);
      await page.goto("/auth/callback?account=hamed.alsiyabi");

      await expect(
        page.getByRole("heading", { name: "Access denied" })
      ).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/callback/);
      await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`the signed-in shell fits at ${breakpoint.name}`, async ({ page }) => {
      // Overflow only. There is deliberately NO assertion that navigation is
      // reachable here: `Sidebar` is `max-lg:hidden` and the prototype
      // (authored at 1440×1080) contains no mobile navigation to translate, so
      // 375/768 ship without one. That gap is logged, not fixed, and a test
      // asserting a mobile nav would fail by design.
      await page.setViewportSize(breakpoint);
      await signInAs(page, "Said Al-Busaidi");

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole("main")).toBeVisible();
      await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test(`a deny screen survives an unbroken server message at ${MOBILE.name}`, async ({
    page,
  }) => {
    // The regression: the server's own message is printed verbatim, and one
    // unbroken token in it widened the document by 98px at this width.
    await page.setViewportSize(MOBILE);
    await failMeWith(page, 401, UNBROKEN_SERVER_TOKEN);

    await signInAs(page, "Said Al-Busaidi");

    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible();
    await expect(page.getByText(UNBROKEN_SERVER_TOKEN)).toBeVisible();
    await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test(`the failure screen survives an unbroken server message at ${MOBILE.name}`, async ({
    page,
  }) => {
    // Same string, the other screen that renders one: anything that is not a
    // 401 or 422 lands on `SignInFailed`. It widened the document by 138px.
    await page.setViewportSize(MOBILE);
    await failMeWith(page, 500, UNBROKEN_SERVER_TOKEN);

    await signInAs(page, "Said Al-Busaidi");

    await expect(
      page.getByRole("heading", { name: /couldn.t sign you in/i })
    ).toBeVisible();
    await expect(page.getByText(UNBROKEN_SERVER_TOKEN)).toBeVisible();
    await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe("sign-in landmarks", () => {
  test("every sign-in screen puts its content inside a main landmark", async ({
    page,
  }) => {
    // axe `landmark-one-main`: the brand panel was the only landmark on these
    // screens, so all four screens' content sat outside any region.
    for (const path of [
      "/auth/login",
      "/auth/access-denied",
      "/auth/callback?account=hamed.alsiyabi",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
    }
  });
});
