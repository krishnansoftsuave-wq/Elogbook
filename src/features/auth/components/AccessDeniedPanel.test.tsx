import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  ACCESS_DENIED_MESSAGE,
  AccessDeniedPanel,
} from "@/features/auth/components/AccessDeniedPanel";
import { renderWithProviders } from "@/test/utils";

describe("AccessDeniedPanel", () => {
  it("renders §5's deny message word for word", () => {
    renderWithProviders(<AccessDeniedPanel />);

    // The contract asks for "a clear 'access denied — contact an administrator'
    // screen, not a generic error", so the wording is part of the contract.
    expect(
      screen.getByText(
        "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
      )
    ).toBeInTheDocument();
    expect(ACCESS_DENIED_MESSAGE).toBe(
      "Access denied: your AD account is not mapped to any platform role. Contact an administrator to request access."
    );
  });

  it("titles the screen with a single heading", () => {
    renderWithProviders(<AccessDeniedPanel />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Access denied"
    );
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("offers a way back so another account can be tried", () => {
    renderWithProviders(<AccessDeniedPanel />);

    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", ROUTES.LOGIN);
  });

  it("announces the refusal, because it replaces a state without navigating", () => {
    // WCAG 4.1.3: `CallbackExchange` swaps this in for "Signing in…" on a
    // 401/422. Without a live region the screen changes from "signing you in"
    // to "you are refused" and a screen reader says nothing at all.
    renderWithProviders(<AccessDeniedPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(ACCESS_DENIED_MESSAGE);
  });

  it("adds the server's own explanation when it says something new", () => {
    renderWithProviders(
      <AccessDeniedPanel detail="Unknown AD group(s): OLNG-CONTRACTORS." />
    );

    expect(
      screen.getByText(/Unknown AD group\(s\): OLNG-CONTRACTORS\./)
    ).toBeInTheDocument();
  });

  it("does not repeat the deny message back as a detail", () => {
    renderWithProviders(<AccessDeniedPanel detail={ACCESS_DENIED_MESSAGE} />);

    expect(
      screen.queryByText(/Details from the server/)
    ).not.toBeInTheDocument();
  });
});
