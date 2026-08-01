import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/layout/Breadcrumb";

/**
 * The prototype's `breadcrumb()` (`app-source.txt` 179–183): home icon, then
 * a chevron + label per part, the last part styled as the current page and
 * never a link.
 */
describe("Breadcrumb", () => {
  it("labels the home link for a screen reader", () => {
    render(<Breadcrumb items={[{ label: "Trends & KPIs" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("renders a single part as the current page, not a link", () => {
    render(<Breadcrumb items={[{ label: "Trends & KPIs" }]} />);

    expect(screen.getByText("Trends & KPIs")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Trends & KPIs" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Trends & KPIs")).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("links every part but the last when an href is given", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin/users" },
          { label: "Workflows" },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin/users"
    );
    expect(
      screen.queryByRole("link", { name: "Workflows" })
    ).not.toBeInTheDocument();
  });

  it("never links the last part even when it carries an href", () => {
    render(
      <Breadcrumb items={[{ label: "Trends & KPIs", href: "/trends" }]} />
    );

    expect(
      screen.queryByRole("link", { name: "Trends & KPIs" })
    ).not.toBeInTheDocument();
  });

  /**
   * `breadcrumb()` colours every part by position — `i===last?C.tealDk:C.teal`
   * — never by whether it carries an `onClick`/`href`. A non-last part with no
   * `href` (unclickable, but not the current page either) still reads teal,
   * the same as a linked one; only the last part gets the darker,
   * AA-contrast-safe `--brand-dark`.
   */
  it("colours the active crumb brand-dark and every earlier crumb primary", () => {
    render(
      <Breadcrumb
        items={[{ label: "Unclickable Parent" }, { label: "Trends & KPIs" }]}
      />
    );

    expect(screen.getByText("Unclickable Parent")).toHaveClass("text-primary");
    expect(screen.getByText("Trends & KPIs")).toHaveClass("text-brand-dark");
  });
});
