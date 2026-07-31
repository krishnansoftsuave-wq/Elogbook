import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { DevRoleSwitcher } from "@/features/auth/components/DevRoleSwitcher";
import { installMockApi, resetMockApi } from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

/**
 * jsdom ships no `ResizeObserver`, and the shared setup's stand-in is an arrow
 * function, which cannot be used with `new`. Base UI's floating positioner
 * constructs one the moment the menu opens — without this the menu never
 * appears and every assertion below fails for a jsdom reason rather than a code
 * one. `Header.test.tsx` records the same trap.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

/**
 * **Dev-only scaffolding**, and the replacement for the `/auth/mock-adfs`
 * account picker. It is *not* the product's role switcher — that one is admin
 * impersonation behind a permission gate and is still unbuilt.
 *
 * ⚠️ The production fold is **not covered here and cannot be**: Vitest runs with
 * `NODE_ENV=test`, so `process.env.NODE_ENV === "production"` is never taken.
 * The guarantee that this does not ship comes from the call-site branch in
 * `Sidebar.tsx` folding at build time, which is verified against a real
 * production bundle rather than asserted in a unit test.
 */

const signedInAs = (username: string, displayName: string, roles: string[]) => {
  installMockApi({ username, displayName, roles });
};

/**
 * Opens the menu and waits for its first row. The rows are queried off `screen`
 * rather than through a container: Base UI portals the popup, and the existing
 * `Header.test.tsx` reaches its items the same way.
 */
const openMenu = async () => {
  await userEvent.click(
    await screen.findByRole("button", { name: /Switch role/ })
  );
  await screen.findByRole("menuitemradio", { name: /Said Al-Busaidi/ });
};

beforeEach(() => {
  push.mockClear();
});

afterEach(() => {
  resetMockApi();
});

describe("DevRoleSwitcher", () => {
  it("shows who is signed in, by role", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);

    expect(
      await screen.findByRole("button", {
        name: "Switch role — signed in as Said Al-Busaidi, Operator",
      })
    ).toBeVisible();
    expect(screen.getByText("Operator")).toBeVisible();
  });

  /**
   * The prototype's copy, which is the spec: the trigger is captioned "Role"
   * (`app-source.txt` 251) and the menu is headed "Switch role" (272). The
   * "dev only" marker is this repo's addition — the prototype has no production
   * build to hide a control from.
   */
  it("uses the prototype's captions, and marks itself as scaffolding", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);

    expect(await screen.findByText("Role")).toBeVisible();

    await openMenu();
    expect(screen.getByText("Switch role")).toBeVisible();
    expect(screen.getByText("dev only")).toBeVisible();
  });

  /**
   * Role first, name second — the prototype's hierarchy, where the large text
   * is what you are switching *to*. The account name stays underneath because
   * these rows are AD accounts, not bare roles.
   */
  it("leads each row with the role and names the account beneath it", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    const row = screen.getByRole("menuitemradio", { name: /Noura Al-Kindi/ });
    expect(row).toHaveTextContent("Administrator");
    expect(row).toHaveTextContent("Noura Al-Kindi");
  });

  it("renders nothing until there is a session to switch away from", () => {
    // No `installMockApi`, so `useSession` has no token and returns null.
    renderWithProviders(<DevRoleSwitcher collapsed={false} />);

    expect(
      screen.queryByRole("button", { name: /Switch role/ })
    ).not.toBeInTheDocument();
  });

  it("lists every account in the mock directory", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    for (const name of [
      "Said Al-Busaidi",
      "Fatma Al-Harthy",
      "Khalid Al-Mamari",
      "Noura Al-Kindi",
      "Yousuf Al-Rawahi",
      "Maryam Al-Zadjali",
      "Hamed Al-Siyabi",
    ]) {
      expect(
        screen.getByRole("menuitemradio", { name: new RegExp(name) })
      ).toBeVisible();
    }
  });

  /**
   * The checked state has to be *announced*, not only drawn. Base UI gives a
   * radio item `role="menuitemradio"` with `aria-checked`, which is why these
   * are a radio group rather than a list of menu items with a tick glyph.
   */
  it("marks the current identity with a state a screen reader can read", async () => {
    signedInAs("fatma.alharthy", "Fatma Al-Harthy", ["supervisor"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    const checked = screen
      .getAllByRole("menuitemradio")
      .filter((row) => row.getAttribute("aria-checked") === "true");

    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveTextContent("Fatma Al-Harthy");
  });

  /**
   * The whole point of the control: re-run the real exchange for another
   * account. `/auth/callback` owns the chain — `POST /dev/token` → `GET /me`,
   * cache cleared before the new token lands, then `homeForSession`.
   */
  it("sends the chosen account back through the sign-in callback", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    await userEvent.click(
      screen.getByRole("menuitemradio", { name: /Noura Al-Kindi/ })
    );

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=noura.alkindi`
    );
  });

  /**
   * **FR-AUTH-03** — "where a user holds multiple roles, grant the highest
   * access with both roles' permissions combined". Switching to this account is
   * how that union gets exercised through a real `GET /me`.
   */
  it("shows the multi-group account as holding both roles", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    expect(
      screen.getByRole("menuitemradio", { name: /Maryam Al-Zadjali/ })
    ).toHaveTextContent("Operator + Management");
  });

  /**
   * §5's deny path stays reachable **from the UI** rather than only by typing a
   * URL, which is what the account picker used to give. `hamed.alsiyabi` is in
   * `OLNG-CONTRACTORS`, which maps to nothing: `POST /dev/token` answers 422
   * before minting and the callback renders the access-denied screen.
   */
  it("lists the unmapped account, labelled as holding no role", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed={false} />);
    await openMenu();

    const row = screen.getByRole("menuitemradio", {
      name: /Hamed Al-Siyabi/,
    });
    expect(row).toHaveTextContent("No platform role");

    await userEvent.click(row);
    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=hamed.alsiyabi`
    );
  });

  /**
   * At `w-16` the caption and role label are `sr-only`, matching the nav rows
   * above. The accessible name has to carry the whole state, because the avatar
   * beside it is `aria-hidden` — otherwise the trigger announces as nothing.
   */
  it("keeps its accessible name when the rail is collapsed", async () => {
    signedInAs("khalid.almamari", "Khalid Al-Mamari", ["management"]);

    renderWithProviders(<DevRoleSwitcher collapsed />);

    const trigger = await screen.findByRole("button", {
      name: "Switch role — signed in as Khalid Al-Mamari, Management",
    });
    expect(trigger).toBeVisible();
    // Still in the accessibility tree, just visually hidden.
    expect(trigger).toHaveTextContent("Management");
  });

  it("still opens the menu when collapsed", async () => {
    signedInAs("said.albusaidi", "Said Al-Busaidi", ["operator"]);

    renderWithProviders(<DevRoleSwitcher collapsed />);
    await openMenu();

    expect(screen.getAllByRole("menuitemradio")).toHaveLength(7);
  });
});
