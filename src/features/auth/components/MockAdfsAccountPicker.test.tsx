import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { MockAdfsAccountPicker } from "@/features/auth/components/MockAdfsAccountPicker";
import { renderWithProviders } from "@/test/utils";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("MockAdfsAccountPicker", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("says plainly that it is not a real Oman LNG page", () => {
    renderWithProviders(<MockAdfsAccountPicker />);

    expect(
      screen.getByText(/Development mock — not a real Oman LNG sign-in page/)
    ).toBeInTheDocument();
  });

  it("names each account's resolved role so a developer can pick one", () => {
    renderWithProviders(<MockAdfsAccountPicker />);

    expect(
      screen.getByRole("button", { name: /Said Al-Busaidi/ })
    ).toHaveAccessibleName(/Operator/);
    // FR-AUTH-03: two groups, both roles named.
    expect(
      screen.getByRole("button", { name: /Maryam Al-Zadjali/ })
    ).toHaveAccessibleName(/Operator \+ Management/);
  });

  it("shows the unmapped account as entitled to nothing", () => {
    renderWithProviders(<MockAdfsAccountPicker />);

    expect(
      screen.getByRole("button", { name: /Hamed Al-Siyabi/ })
    ).toHaveAccessibleName(/No platform role/);
  });

  it("hands the chosen account to the callback with the return route", async () => {
    renderWithProviders(<MockAdfsAccountPicker returnTo="/logbook/add" />);

    await userEvent.click(
      screen.getByRole("button", { name: /Said Al-Busaidi/ })
    );

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=said.albusaidi&returnTo=${encodeURIComponent("/logbook/add")}`
    );
  });

  it("omits returnTo entirely when there is nowhere to go back to", async () => {
    renderWithProviders(<MockAdfsAccountPicker />);

    await userEvent.click(
      screen.getByRole("button", { name: /Noura Al-Kindi/ })
    );

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=noura.alkindi`
    );
  });

  it("locks the list once a selection is under way", async () => {
    renderWithProviders(<MockAdfsAccountPicker />);

    const chosen = screen.getByRole("button", { name: /Said Al-Busaidi/ });
    await userEvent.click(chosen);

    expect(chosen).toHaveAttribute("aria-busy", "true");
    await userEvent.click(
      screen.getByRole("button", { name: /Fatma Al-Harthy/ })
    );
    expect(push).toHaveBeenCalledTimes(1);
  });
});
