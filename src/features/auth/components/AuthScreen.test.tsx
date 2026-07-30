import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BRAND_NAME } from "@/constants/brand";
import {
  AuthBarScreen,
  AuthSplitScreen,
} from "@/features/auth/components/AuthScreen";

describe("AuthSplitScreen", () => {
  it("puts the screen's content in a main landmark", () => {
    // axe `landmark-one-main`: the brand panel is an `<aside>`, so without
    // this the content of every sign-in screen sat outside any region.
    render(
      <AuthSplitScreen>
        <p>content</p>
      </AuthSplitScreen>
    );

    expect(screen.getByRole("main")).toHaveTextContent("content");
  });

  it("states the product name without claiming the page's heading", () => {
    // Each screen owns the single `<h1>`; the brand panel must not take it.
    render(
      <AuthSplitScreen>
        <h1>Welcome</h1>
      </AuthSplitScreen>
    );

    expect(screen.getAllByText(BRAND_NAME).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading")).toHaveTextContent("Welcome");
  });

  it("renders the brand panel on the prototype's gradient", () => {
    const { container } = render(
      <AuthSplitScreen>
        <p>content</p>
      </AuthSplitScreen>
    );

    expect(container.querySelector("aside")).toHaveClass(
      "bg-[image:var(--brand-gradient)]"
    );
  });

  it("widens the content column only when asked", () => {
    const { container: narrow } = render(
      <AuthSplitScreen>
        <p>content</p>
      </AuthSplitScreen>
    );
    const { container: wide } = render(
      <AuthSplitScreen contentClassName="max-w-[28rem]">
        <p>content</p>
      </AuthSplitScreen>
    );

    expect(narrow.querySelector("main > div")).toHaveClass("max-w-[23.75rem]");
    expect(wide.querySelector("main > div")).toHaveClass("max-w-[28rem]");
  });
});

describe("AuthBarScreen", () => {
  it("names the product in its bar and keeps content in a main landmark", () => {
    render(
      <AuthBarScreen>
        <p>content</p>
      </AuthBarScreen>
    );

    expect(screen.getByText(BRAND_NAME)).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("content");
  });

  it("uses the same brand teal the application top bar does", () => {
    // The point of this shell is that it rehearses the bar the user is about
    // to land on. A different colour here would read as a different app.
    const { container } = render(
      <AuthBarScreen>
        <p>content</p>
      </AuthBarScreen>
    );

    expect(container.querySelector(".bg-brand-surface")).toBeInTheDocument();
  });
});
