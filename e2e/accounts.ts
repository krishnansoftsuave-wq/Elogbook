import { type Page } from "@playwright/test";

/**
 * Becoming somebody — for the specs that are about a *feature* rather than
 * about signing in.
 *
 * `e2e/auth.spec.ts` owns the sign-in chain itself: the button, the sidebar
 * switcher, the deny screen, the failure screen, `returnTo`. Every other spec
 * just needs to *be* a given role before it starts, and that is all this does.
 *
 * ## Why this drives the callback rather than the UI
 *
 * The sign-in button signs in as the Operator and nobody else
 * (`DEFAULT_MOCK_ACCOUNT`), so becoming anyone else through the UI means the
 * `DevRoleSwitcher` in the sidebar footer — and the sidebar is `max-lg:hidden`.
 * Every `responsive` block in these specs runs at 375 and 768, where that
 * control does not exist, so a helper built on it would fail the very tests
 * that check the app at those widths.
 *
 * `/auth/callback` is the reply URL both the button and the switcher push to.
 * Driving it directly runs the identical exchange — `POST /dev/token` →
 * `GET /me` → `homeForSession(permissions)` — at any viewport.
 *
 * ## Why the map is copied
 *
 * These specs are black box: nothing under `e2e/` imports from `src/`. So the
 * directory is restated here rather than imported from
 * `src/mocks/auth/directory.ts`. Drift is loud, not silent — a username that no
 * longer exists is refused by `POST /dev/token` with a 422, the browser stops
 * on the access-denied screen, and every test in the calling file fails on its
 * landing assertion.
 */
const USERNAME: Readonly<Record<string, string>> = {
  "Said Al-Busaidi": "said.albusaidi",
  "Fatma Al-Harthy": "fatma.alharthy",
  "Khalid Al-Mamari": "khalid.almamari",
  "Noura Al-Kindi": "noura.alkindi",
  "Yousuf Al-Rawahi": "yousuf.alrawahi",
  "Maryam Al-Zadjali": "maryam.alzadjali",
  /** In AD, entitled to nothing — §5's deny path. Signing in as him fails. */
  "Hamed Al-Siyabi": "hamed.alsiyabi",
};

/**
 * Signs in as the named account and returns as soon as the exchange has been
 * *started*. Callers wait for their own landing route, because where a session
 * lands depends on what it may see — `homeForSession` sends the admin tree to
 * `/admin/users` and everyone else to `/dashboard`.
 */
export const signInAs = async (page: Page, displayName: string) => {
  const username = USERNAME[displayName];

  // A typo here would otherwise navigate to `?account=undefined`, fail the
  // exchange, and read exactly like a permissions bug.
  if (!username) {
    throw new Error(
      `No mock account named "${displayName}" — see e2e/accounts.ts`
    );
  }

  await page.goto(`/auth/callback?account=${username}`);
};
