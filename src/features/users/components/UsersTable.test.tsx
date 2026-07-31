import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { UsersTable } from "@/features/users/components/UsersTable";
import {
  installMockApi,
  mockRoute,
  paginatedEnvelope,
  resetMockApi,
  envelope,
} from "@/test/mockApi";
import { renderWithProviders } from "@/test/utils";

const ADMIN_PERMISSIONS = ["*"];
/** §6.5 — "Can view users", and nothing that manages them. */
const SUPER_USER_PERMISSIONS = [
  "dashboard:configure",
  "widget:assign",
  "metric:control",
  "access:control",
  "user:read",
];

const user = (overrides: Record<string, unknown> = {}) => ({
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
  ad_groups: ["OLNG-ELOG-OPERATORS"],
  roles: ["operator"],
  status: "active",
  last_seen_at: null,
  ...overrides,
});

const MULTI_ROLE = user({
  username: "maryam.alzadjali",
  display_name: "Maryam Al-Zadjali",
  ad_groups: ["OLNG-ELOG-OPERATORS", "OLNG-ELOG-SUPERINTENDENTS"],
  roles: ["operator", "management"],
});

const UNMAPPED = user({
  username: "hamed.alsiyabi",
  display_name: "Hamed Al-Siyabi",
  ad_groups: ["OLNG-CONTRACTORS"],
  roles: [],
});

const stubUsers = (items: readonly unknown[] = [user()]) => {
  mockRoute("GET", /\/users$/, () => paginatedEnvelope(items));
};

const rowFor = (displayName: string) =>
  screen.getByRole("row", { name: new RegExp(displayName) });

afterEach(() => {
  resetMockApi();
});

describe("UsersTable", () => {
  it("shows the display name over the AD username", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers();

    renderWithProviders(<UsersTable />);

    expect(await screen.findByText("Said Al-Busaidi")).toBeVisible();
    expect(screen.getByText("said.albusaidi")).toBeVisible();
  });

  /**
   * **FR-AUTH-03** — a person may hold several roles, so the column is plural.
   * The old single-role field could not describe the directory this build ships.
   */
  it("lists every role a multi-role person holds", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers([MULTI_ROLE]);

    renderWithProviders(<UsersTable />);

    const row = await screen.findByRole("row", { name: /Maryam Al-Zadjali/ });
    expect(within(row).getByText("Operator")).toBeVisible();
    expect(within(row).getByText("Management")).toBeVisible();
  });

  /**
   * An account whose AD groups map to no platform role is denied at sign-in
   * (§5), and the Administrator is the person who has to notice. An empty cell
   * would read as missing data rather than as the condition it is.
   */
  it("says so when an account's groups map to no platform role", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers([UNMAPPED]);

    renderWithProviders(<UsersTable />);

    const row = await screen.findByRole("row", { name: /Hamed Al-Siyabi/ });
    expect(within(row).getByText("No platform role")).toBeVisible();
    expect(within(row).getByText("OLNG-CONTRACTORS")).toBeVisible();
  });

  /**
   * The UI half of **FR-ADM-03**: `PATCH /users/:username` takes the wildcard,
   * and §6.5 gives the Super User read access only. Preview stays — reading is
   * exactly what they may do.
   */
  it("offers no access control to a Super User, only the preview link", async () => {
    installMockApi({ permissions: SUPER_USER_PERMISSIONS });
    stubUsers();

    renderWithProviders(<UsersTable />);

    expect(
      await screen.findByRole("link", { name: "Preview Said Al-Busaidi" })
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Suspend Said Al-Busaidi" })
    ).not.toBeInTheDocument();
  });

  it("offers an Administrator a suspend control per row", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers();

    renderWithProviders(<UsersTable />);

    expect(
      await screen.findByRole("button", { name: "Suspend Said Al-Busaidi" })
    ).toBeVisible();
  });

  it("offers a restore control instead once somebody is suspended", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers([user({ status: "suspended" })]);

    renderWithProviders(<UsersTable />);

    expect(
      await screen.findByRole("button", {
        name: "Restore access for Said Al-Busaidi",
      })
    ).toBeVisible();
    // WCAG 1.4.1 — the dimmed row is not the only signal.
    expect(screen.getByText("Suspended")).toBeVisible();
  });

  /**
   * **FR-ADM-01** end to end: confirm, and only `status` goes to the server.
   * Nothing that Active Directory owns may ride along.
   */
  it("sends only a status change when a suspension is confirmed", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers();

    let sent: unknown;
    mockRoute("PATCH", /\/users\/said\.albusaidi$/, (config) => {
      sent = JSON.parse(String(config.data));
      return envelope(user({ status: "suspended" }));
    });

    renderWithProviders(<UsersTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Suspend Said Al-Busaidi" })
    );

    const dialog = await screen.findByRole("alertdialog");
    // The copy names which of the two systems is changing — an Administrator
    // who read it as "disables their AD account" would think a leaver was
    // handled when they were not.
    expect(
      within(dialog).getByText(/Active Directory account .* untouched/)
    ).toBeVisible();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Suspend" })
    );

    await waitFor(() => expect(sent).toEqual({ status: "suspended" }));
  });

  it("sends nothing when the confirmation is cancelled", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers();

    let patches = 0;
    mockRoute("PATCH", /\/users\//, () => {
      patches += 1;
      return envelope(user());
    });

    renderWithProviders(<UsersTable />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Suspend Said Al-Busaidi" })
    );
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      })
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    );
    expect(patches).toBe(0);
  });

  /**
   * There is no Add and no Delete, and their absence is the design rather than
   * an oversight — identities originate in AD (**FR-AUTH-02**), so a user minted
   * here would carry no groups and could never sign in. Asserting on the row's
   * own controls rather than on the whole document, so this cannot pass by
   * accident if the table stops rendering.
   */
  it("offers no delete control on a row", async () => {
    installMockApi({ permissions: ADMIN_PERMISSIONS });
    stubUsers();

    renderWithProviders(<UsersTable />);
    await screen.findByText("Said Al-Busaidi");

    const row = rowFor("Said Al-Busaidi");
    const controls = [
      ...within(row).getAllByRole("link"),
      ...within(row).getAllByRole("button"),
    ].map((element) => element.getAttribute("aria-label"));

    expect(controls).toEqual([
      "Preview Said Al-Busaidi",
      "Suspend Said Al-Busaidi",
    ]);
  });
});
