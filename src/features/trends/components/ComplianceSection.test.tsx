import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComplianceSection } from "@/features/trends/components/ComplianceSection";
import type { ComplianceCategory } from "@/features/trends/schemas";

const CATEGORIES: ComplianceCategory[] = [
  {
    code: "active_force",
    label: "Active Force",
    buckets: [
      { bucket: "overdue", count: 2 },
      { bucket: "due_within_7_days", count: 3 },
      { bucket: "due_within_30_days", count: 1 },
      { bucket: "due_beyond_30_days", count: 0 },
      { bucket: "no_due_date", count: 1 },
    ],
  },
  {
    code: "smith_lock",
    label: "SMITH Lock",
    buckets: [
      { bucket: "overdue", count: 5 },
      { bucket: "due_within_7_days", count: 0 },
      { bucket: "due_within_30_days", count: 0 },
      { bucket: "due_beyond_30_days", count: 2 },
      { bucket: "no_due_date", count: 0 },
    ],
  },
];

/**
 * Every tile's headline number collides with plenty of other numbers on this
 * screen (table cells, chart totals), so each assertion is scoped to the tile
 * card the label lives in rather than a bare `getByText`.
 */
const tileValue = (label: string): string | null => {
  // Scoped to a `<p>`: the same label text also appears in the chart's own
  // legend (`<li>`) and accessible-table header (`<th>`) for the due-date
  // buckets that share a name with a tile (e.g. "Overdue").
  const card = screen
    .getByText(label, { selector: "p" })
    .closest('[data-slot="card"]');
  if (!card) throw new Error(`No card found for tile "${label}"`);
  return within(card as HTMLElement).getByText(/^\d+$/).textContent;
};

describe("ComplianceSection", () => {
  it("derives the four summary tiles from the category buckets", () => {
    render(<ComplianceSection complianceCategories={CATEGORIES} />);

    // Total open items = sum of every count above = 14.
    expect(tileValue("Total open items")).toBe("14");
    // Overdue = 2 + 5 = 7.
    expect(tileValue("Overdue")).toBe("7");
    // Due <= 7 days = 3 + 0 = 3.
    expect(tileValue("Due ≤ 7 days")).toBe("3");
    // No due date = 1 + 0 = 1.
    expect(tileValue("No due date")).toBe("1");
  });

  it("labels the total tile with the category count", () => {
    render(<ComplianceSection complianceCategories={CATEGORIES} />);
    expect(screen.getByText("across 2 categories")).toBeInTheDocument();
  });

  it("ranks categories by overdue count, highest first", () => {
    render(<ComplianceSection complianceCategories={CATEGORIES} />);

    const table = screen.getByRole("table", {
      name: "Compliance items — due-date status by category",
    });
    const rowHeaders = within(table)
      .getAllByRole("rowheader")
      .map((cell) => cell.textContent);

    // SMITH Lock has 5 overdue vs Active Force's 2, so it ranks first even
    // though it was declared second.
    expect(rowHeaders).toEqual(["SMITH Lock", "Active Force"]);
  });

  it("reads each category's counts by bucket name rather than array position", () => {
    // A category whose buckets arrive in a different order than DUE_BUCKETS
    // must still land in the right accessible-table column.
    const shuffled: ComplianceCategory[] = [
      {
        code: "reordered",
        label: "Reordered",
        buckets: [
          { bucket: "no_due_date", count: 9 },
          { bucket: "overdue", count: 4 },
        ],
      },
    ];

    render(<ComplianceSection complianceCategories={shuffled} />);

    const table = screen.getByRole("table", {
      name: "Compliance items — due-date status by category",
    });
    const row = within(table)
      .getByRole("rowheader", { name: "Reordered" })
      .closest("tr");
    expect(row).not.toBeNull();

    const cells = within(row as HTMLElement).getAllByRole("cell");
    // Column order follows DUE_BUCKETS: overdue, due7, due30, beyond30, noDate.
    expect(cells[0]).toHaveTextContent("4");
    expect(cells[4]).toHaveTextContent("9");
  });
});
