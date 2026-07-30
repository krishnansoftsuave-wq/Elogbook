import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { UserForm } from "@/features/users/components/UserForm";
import { renderWithProviders } from "@/test/utils";

describe("UserForm", () => {
  it("blocks submission and explains why when the input is invalid", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <UserForm
        submitLabel="Create user"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hands validated values to the caller", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <UserForm
        submitLabel="Create user"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "operator",
      status: "invited",
    });
  });

  it("disables the submit button while the mutation is in flight", () => {
    renderWithProviders(
      <UserForm submitLabel="Create user" isSubmitting onSubmit={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Create user" })).toBeDisabled();
  });

  it("exposes Cancel as a link, because it navigates", () => {
    // Regression: Cancel was a Base UI `Button` with `render={<Link/>}`, which
    // warns that it expected a native <button>. The tempting fix —
    // `nativeButton={false}` — makes Base UI stamp `role="button"` on the
    // anchor, overriding its implicit `link` role: it would then be announced
    // as a button and drop out of a screen reader's list of links. Cancel
    // navigates, so it must stay a link styled as a button.
    renderWithProviders(
      <UserForm
        submitLabel="Create user"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    const cancel = screen.getByRole("link", { name: "Cancel" });
    expect(cancel).toHaveAttribute("href", ROUTES.ADMIN.USERS);
    expect(
      screen.queryByRole("button", { name: "Cancel" })
    ).not.toBeInTheDocument();
  });
});
