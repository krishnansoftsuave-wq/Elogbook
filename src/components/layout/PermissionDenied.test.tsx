import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PERMISSION_DENIED_MESSAGE,
  PermissionDenied,
} from "@/components/layout/PermissionDenied";
import { renderWithProviders } from "@/test/utils";

describe("PermissionDenied", () => {
  it("explains the refusal without ending the session", () => {
    renderWithProviders(<PermissionDenied />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      PERMISSION_DENIED_MESSAGE
    );
  });

  it("prefers the server's own wording when the 403 carried one", () => {
    renderWithProviders(
      <PermissionDenied message="Forbidden: this action requires the 'shift:read' permission." />
    );

    expect(
      screen.getByText(
        "Forbidden: this action requires the 'shift:read' permission."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(PERMISSION_DENIED_MESSAGE)
    ).not.toBeInTheDocument();
  });

  it("leaves the page's own <h1> alone", () => {
    // §3: a 403 keeps the user logged in, so this renders inside a page that
    // already has a title rather than replacing the screen.
    renderWithProviders(<PermissionDenied />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});
