import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/components/layout/BrandMark";
import { BRAND_LETTER } from "@/constants/brand";

describe("BrandMark", () => {
  it("is hidden from assistive technology", () => {
    // Every caller states the product name in adjacent text. Announcing a
    // single letter alongside it is noise, not information.
    const { container } = render(<BrandMark />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    // `ignore` is what models the accessibility tree here: a plain
    // `queryByText` walks the DOM and would find the letter regardless of
    // `aria-hidden`, so it would pass whether or not the attribute was set.
    expect(
      screen.queryByText(BRAND_LETTER, {
        ignore: "[aria-hidden='true'], [aria-hidden='true'] *",
      })
    ).not.toBeInTheDocument();
  });

  it("paints the letter on the brand teal by default", () => {
    const { container } = render(<BrandMark />);

    expect(container.firstElementChild).toHaveClass(
      "bg-brand-surface",
      "text-on-brand"
    );
  });

  it("inverts on a brand surface so the tile stays white", () => {
    const { container } = render(<BrandMark onBrand />);

    expect(container.firstElementChild).toHaveClass(
      "bg-on-brand",
      "text-brand-surface"
    );
  });

  it("never uses --primary, which flips with the theme", () => {
    // `--primary` is the dark theme's brighter teal, which on the mark's white
    // tile measures 2.59:1. `--brand-surface` holds one value in both themes.
    for (const onBrand of [true, false]) {
      const { container } = render(<BrandMark onBrand={onBrand} />);
      const className = container.firstElementChild?.className ?? "";

      expect(className).not.toMatch(/\bbg-primary\b/);
      expect(className).not.toMatch(/\btext-primary\b/);
    }
  });

  it("carries a distinct box size per call site", () => {
    const { container: sm } = render(<BrandMark size="sm" />);
    const { container: lg } = render(<BrandMark size="lg" />);

    expect(sm.firstElementChild).toHaveClass("size-7");
    expect(lg.firstElementChild).toHaveClass("size-15");
  });
});
