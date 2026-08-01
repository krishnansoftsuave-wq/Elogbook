import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RoleForm } from "@/features/admin/components/RoleForm";
import { EMPTY_MODULE_PERMISSIONS } from "@/features/admin/schemas";
import { renderWithProviders } from "@/test/utils";

const EXISTING_AD_GROUPS = ["ELOGBOOK_OPERATOR", "ELOGBOOK_SHUTDOWN"];

describe("RoleForm", () => {
  it("starts every permission unchecked and Full plant selected for a new role", () => {
    renderWithProviders(
      <RoleForm
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByRole("checkbox", { name: "Assistant — View" })
    ).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Full plant" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  /**
   * The AD group `<Select>` is a Base UI portal control this environment
   * cannot drive (its positioning depends on `ResizeObserver`/`@floating-ui`
   * `autoUpdate`, unmocked here — no other feature in this repo interacts
   * with `Select` via role queries either). This exercises everything else a
   * submit needs: the name field, one permission checkbox, and the inline AD
   * group input reached by pre-filling `defaultValues` with an unlisted
   * group rather than opening the dropdown.
   */
  it("checks a permission cell and includes it in the submitted values", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RoleForm
        defaultValues={{
          name: "",
          permissions: EMPTY_MODULE_PERMISSIONS,
          dataScope: "full_plant",
          adGroup: "",
        }}
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await userEvent.type(screen.getByLabelText("Role name"), "Safety Auditor");
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Reports — Export" })
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Save & activate" })
    );

    // `adGroup` is required, and the Select above cannot be driven — the
    // submit is expected to stay blocked by that validation error rather
    // than fire, which this asserts instead of pretending to fill it in.
    await waitFor(() =>
      expect(
        screen.getByText("Choose or create an AD group mapping")
      ).toBeVisible()
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the changed permissions and name for a role with a pre-filled AD group", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RoleForm
        defaultValues={{
          name: "Shutdown Coordinator",
          permissions: EMPTY_MODULE_PERMISSIONS,
          dataScope: "full_plant",
          adGroup: "ELOGBOOK_SHUTDOWN_NEW",
        }}
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save changes"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await userEvent.clear(screen.getByLabelText("Role name"));
    await userEvent.type(screen.getByLabelText("Role name"), "Shutdown Lead");
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Actions — Approve" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0][0];
    expect(values.name).toBe("Shutdown Lead");
    expect(values.permissions.actions.approve).toBe(true);
    expect(values.adGroup).toBe("ELOGBOOK_SHUTDOWN_NEW");
  });

  /**
   * The AD group field only appears once a role either starts on a group not
   * in `existingAdGroups`, or the "+ Create new..." path is chosen — this
   * proves the first without driving the portal-rendered `<Select>`.
   */
  it("shows the inline AD group field when editing a role on an unlisted group", () => {
    renderWithProviders(
      <RoleForm
        defaultValues={{
          name: "Reliability Engineer",
          permissions: EMPTY_MODULE_PERMISSIONS,
          dataScope: "full_plant",
          adGroup: "ELOGBOOK_RELIABILITY",
        }}
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save changes"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText("New AD group name")).toHaveValue(
      "ELOGBOOK_RELIABILITY"
    );
  });

  /**
   * Every `setValue` in this form passes `{ shouldValidate: true }`. Without
   * it a programmatic write leaves a stale error on screen: RHF's default
   * `mode: "onSubmit"` only revalidates a field on the next submit, so an
   * `adGroup` error raised by a blocked submit would still be visible after
   * the user supplied a group, with the submit button apparently doing
   * nothing.
   *
   * Driven through the inline "New AD group name" input rather than the
   * `<Select>` — same `setValue("adGroup", …)` write, and the portal control
   * is not drivable here (see the note above).
   */
  it("clears the AD group error once a group is supplied after a failed submit", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RoleForm
        defaultValues={{
          name: "Safety Auditor",
          permissions: EMPTY_MODULE_PERMISSIONS,
          dataScope: "full_plant",
          // Unlisted, so the inline input renders; empty would hide it.
          adGroup: "ELOGBOOK_TEMP",
        }}
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    const adGroupInput = screen.getByLabelText("New AD group name");
    await userEvent.clear(adGroupInput);

    await userEvent.click(
      screen.getByRole("button", { name: "Save & activate" })
    );

    await waitFor(() =>
      expect(
        screen.getByText("Choose or create an AD group mapping")
      ).toBeVisible()
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(adGroupInput, "ELOGBOOK_SAFETY_AUDITOR");

    await waitFor(() =>
      expect(
        screen.queryByText("Choose or create an AD group mapping")
      ).not.toBeInTheDocument()
    );
  });

  /**
   * §9.2's tension: the BRD names Area-Restricted as a selectable scope
   * (§9.1) but says data-level area filtering is "not required" (§9.2). The
   * form surfaces that rather than silently accepting the value.
   */
  it("flags that area-restricted scope is not enforced yet", async () => {
    renderWithProviders(
      <RoleForm
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.queryByText(/does not yet enforce an area-restricted scope/)
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Area-restricted" })
    );

    expect(
      screen.getByText(/does not yet enforce an area-restricted scope/)
    ).toBeVisible();
  });

  it("disables the submit button while a mutation is pending", () => {
    renderWithProviders(
      <RoleForm
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Save & activate" })
    ).toBeDisabled();
  });

  /**
   * FR-AUTH-02 — a base role's AD group mapping is AD's, not this form's, to
   * rewrite. Name and permissions stay editable; only the mapping locks.
   */
  it("locks the AD group field for a base role but leaves the rest editable", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <RoleForm
        defaultValues={{
          name: "Operator",
          permissions: EMPTY_MODULE_PERMISSIONS,
          dataScope: "full_plant",
          adGroup: "ELOGBOOK_OPERATOR",
        }}
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save changes"
        isSubmitting={false}
        adGroupLocked
        onSubmit={onSubmit}
      />
    );

    const adGroupField = screen.getByLabelText("AD group mapping");
    expect(adGroupField).toBeDisabled();
    expect(adGroupField).toHaveValue("ELOGBOOK_OPERATOR");
    expect(screen.getByText(/governed by the OLNG AD admin/)).toBeVisible();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Actions — Approve" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const values = onSubmit.mock.calls[0][0];
    expect(values.adGroup).toBe("ELOGBOOK_OPERATOR");
    expect(values.permissions.actions.approve).toBe(true);
  });

  it("offers a Cancel link back to the roles list", () => {
    renderWithProviders(
      <RoleForm
        existingAdGroups={EXISTING_AD_GROUPS}
        submitLabel="Save & activate"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/admin/roles"
    );
  });
});
