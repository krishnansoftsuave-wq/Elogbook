import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { SignInPanel } from "@/features/auth/components/SignInPanel";
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

  it("hands off to the identity provider", async () => {
    renderWithProviders(<SignInPanel />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    );

    expect(push).toHaveBeenCalledWith(ROUTES.MOCK_ADFS);
  });

  it("carries the route the visitor was trying to reach", async () => {
    renderWithProviders(<SignInPanel returnTo="/logbook/add" />);

    await userEvent.click(
      screen.getByRole("button", { name: "Sign in with Oman LNG Account" })
    );

    expect(push).toHaveBeenCalledWith(
      `${ROUTES.MOCK_ADFS}?returnTo=${encodeURIComponent("/logbook/add")}`
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
