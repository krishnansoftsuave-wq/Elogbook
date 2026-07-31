import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
import { DEFAULT_MOCK_ACCOUNT } from "@/mocks/auth/directory";
import { renderWithProviders } from "@/test/utils";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("SignInPanel", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("offers single sign-on and asks for no credentials", async () => {
    renderWithProviders(<SignInPanel />);

    expect(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    ).toBeInTheDocument();

    // §1: the backend "never stores passwords and never authenticates a
    // username/password itself". The prototype's `loginField` helper is dead
    // code, so a field here would be a screen nobody designed and a flow the
    // contract has no endpoint for.
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("gives the screen exactly one heading", () => {
    renderWithProviders(<SignInPanel />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Welcome"
    );
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  /**
   * Straight to the reply URL, with no account picker in between. That screen
   * was invented — in neither the BRD nor the prototype — and choosing an
   * identity moved to `DevRoleSwitcher` in the sidebar footer.
   */
  it("hands off to the identity provider as the default account", async () => {
    renderWithProviders(<SignInPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    );

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=${DEFAULT_MOCK_ACCOUNT}`
    );
  });

  it("carries the route the visitor was trying to reach", async () => {
    renderWithProviders(<SignInPanel returnTo="/logbook/add" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    );

    // `URLSearchParams` encodes the path, so this is the literal target rather
    // than a template that could disagree with the component's encoding.
    expect(push).toHaveBeenCalledWith(
      `${ROUTES.CALLBACK}?account=${DEFAULT_MOCK_ACCOUNT}&returnTo=%2Flogbook%2Fadd`
    );
  });

  it("shows a pending state and refuses a second click while redirecting", async () => {
    renderWithProviders(<SignInPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    );

    const button = screen.getByRole("button", {
      name: "Opening Oman LNG sign-in…",
    });
    // `aria-disabled`, not the native attribute. Natively disabling the
    // element that holds focus hands focus back to `<body>`, so the new label
    // is announced to nobody — and the visitor loses their place in the tab
    // order while the navigation is still in flight.
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveFocus();

    await userEvent.click(button);
    expect(push).toHaveBeenCalledTimes(1);
  });
});
