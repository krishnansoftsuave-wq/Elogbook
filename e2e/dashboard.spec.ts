import { expect, test, type Locator, type Page } from "@playwright/test";

import { signInAs } from "./accounts";

/**
 * The Operator's dashboard, and specifically the **Safety KPI** chart on it —
 * §7.12's plant-operations cards, under FR-DASH-01's role-based dashboard.
 *
 * ## Why this chart gets an e2e spec of its own
 *
 * Because jsdom cannot catch what broke here. `StackedBarChart`'s unit tests
 * assert on the accessible table, which is this project's own markup and was
 * correct throughout — while the *drawn* chart was wrong in three ways at once:
 * three of seven columns had no total printed above them, the tooltip could land
 * 320px to the side of the column it described and overlapping it, and the hover
 * shading could pick out a different column entirely.
 *
 * All three were one defect (`categoryIndexOf` records it: Recharts renumbers a
 * series' rectangles when it drops the zero-height ones), and none of the three
 * is observable without layout. jsdom renders no Recharts geometry, so a unit
 * test written against it proves nothing — one was tried and removed for saying
 * nothing. These assertions are on measured pixels, which is the only place the
 * defect ever existed.
 *
 * Requires the mock backend (`npm run dev`), which `playwright.config.ts` starts
 * by default.
 */

const OPERATOR = "Said Al-Busaidi";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const FIRST_PAINT = { timeout: 30_000 } as const;

/**
 * The Safety KPI chart, **by its accessible name**.
 *
 * Was `getByRole("img").first()`, which is positional and silently started
 * resolving to something else the moment another image-role element appeared
 * above it on the page — the failure looked like "the chart has no bars". The
 * name is `ChartFrame`'s `aria-label`, so this finds the chart by the same
 * string a screen-reader user hears.
 */
const safetyChart = (page: Page): Locator =>
  page.getByRole("img", {
    name: "Open safety items by category and due date",
  });

const BAR = ".recharts-bar-rectangle";

const openDashboard = async (page: Page) => {
  await signInAs(page, OPERATOR);
  await page.waitForURL(/\/dashboard$/, FIRST_PAINT);
  await expect(page.getByText("Safety KPI")).toBeVisible(FIRST_PAINT);
  /*
    The card's heading paints before Recharts has measured its container and
    drawn anything, so waiting on the title alone raced the chart — the failure
    read as "the chart has no bars" rather than "the test looked too early".
    A drawn rectangle is the real signal that layout has happened.
  */
  await expect(safetyChart(page).locator(BAR).first()).toBeVisible(FIRST_PAINT);
};

/**
 * One representative drawn rectangle per column, as `[columnX, nodeIndex]`.
 *
 * Deliberately not "the nth rectangle": Recharts emits them series by series and
 * omits the zero-height ones, so neither the count nor the order matches the
 * columns. Grouping by x is what makes this independent of that — and it is the
 * same filtering that caused the defect these tests cover.
 */
const columnSamples = (chart: Locator) =>
  chart.locator(BAR).evaluateAll((nodes) => {
    const byColumn = new Map<number, number>();
    nodes.forEach((node, index) => {
      const x = Math.round(node.getBoundingClientRect().x);
      if (!byColumn.has(x)) byColumn.set(x, index);
    });
    return [...byColumn.entries()].sort((a, b) => a[0] - b[0]);
  });

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

test.describe("Safety KPI chart", () => {
  /**
   * The regression the owner reported twice — "the 18 is missing", "it should be
   * shown always in all bars". Counted rather than matched by value, so this does
   * not depend on the seed's figures, only on every column carrying one.
   */
  test("prints a total above every column, not only where the top bucket is non-zero", async ({
    page,
  }) => {
    await openDashboard(page);
    const chart = safetyChart(page);

    const columns = await columnSamples(chart);
    expect(columns.length).toBeGreaterThan(1);

    const drawn = await chart
      .locator("text")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent));
    // The category ticks are words; the totals are the numbers.
    const numeric = drawn.filter((text) => text !== null && /^\d+$/.test(text));

    expect(numeric).toHaveLength(columns.length);
  });

  /**
   * The other two symptoms, per column: the panel is centred on the column it
   * describes, and sits above the *stack's* top rather than at the pointer.
   *
   * Measured on the panel inside `.recharts-tooltip-wrapper`, not the wrapper
   * itself: the wrapper sits at the raw anchor, and the panel carries the
   * `-translate-x-1/2 -translate-y-full` that puts it where a reader sees it. A
   * transform on a child does not move the parent's box, so measuring the wrapper
   * would report the anchor and pass whatever the panel actually did.
   */
  test("anchors the tooltip above the centre of whichever column is hovered", async ({
    page,
  }) => {
    await openDashboard(page);
    const chart = safetyChart(page);
    const panel = chart.locator(".recharts-tooltip-wrapper > *").first();
    const cardBox = await chart
      .locator('xpath=ancestor::*[@data-slot="card"]')
      .boundingBox();
    expect(cardBox).not.toBeNull();

    const samples = await columnSamples(chart);
    for (const [position, [, index]] of samples.entries()) {
      /*
        The first and last columns are **not** centred, and that is the
        prototype's own rule rather than a tolerance: `iStackBar` (533) sets
        `left:0` on the first, `right:0` on the last and `transform:none` on
        both, centring only the ones in between. Recharts reproduces it by
        clamping an unpinned tooltip to the plot — which is exactly why the
        anchor pins `y` alone. Requiring every column to centre would have
        demanded the panel hang outside the card, and `ui/card` is
        `overflow-hidden`, so it would have been sheared rather than seen.
      */
      const isEdge = position === 0 || position === samples.length - 1;
      const box = await chart.locator(BAR).nth(index).boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect(panel).toBeVisible();

      const measured = await chart.evaluate((node, x: number) => {
        const tooltip = node.querySelector(".recharts-tooltip-wrapper > *");
        const tops = [...node.querySelectorAll(".recharts-bar-rectangle")]
          .map((rect) => rect.getBoundingClientRect())
          .filter((rect) => Math.abs(rect.x - x) < 2)
          .map((rect) => rect.y);
        const rect = tooltip?.getBoundingClientRect();
        return {
          columnTop: Math.min(...tops),
          panel: rect
            ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            : null,
        };
      }, box.x);

      expect(measured.panel).not.toBeNull();
      if (!measured.panel) continue;

      // Centred on the column, within a pixel of rounding — except at an edge.
      const centreOffset =
        measured.panel.x + measured.panel.width / 2 - (box.x + box.width / 2);
      if (!isEdge) expect(Math.abs(centreOffset)).toBeLessThan(1.5);

      /*
        Inside the card, always — including the two edge columns, which is the
        thing the clamp buys and the thing that broke when the anchor pinned `x`.
      */
      expect(measured.panel.x).toBeGreaterThanOrEqual((cardBox?.x ?? 0) - 1);
      expect(measured.panel.x + measured.panel.width).toBeLessThanOrEqual(
        (cardBox?.x ?? 0) + (cardBox?.width ?? 0) + 1
      );

      // Clear of the stack's top edge — above it, and not by a wild margin.
      const gap =
        measured.columnTop - (measured.panel.y + measured.panel.height);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(24);
    }
  });

  /**
   * The hover emphasis belongs to the whole column — the owner's "shadow should
   * add only for whole bar not the every color in the bar".
   *
   * The failure this pins is subtler than "no shading": a backdrop is drawn per
   * *rendered* rectangle, so keying it on the wrong index shaded a neighbouring
   * column, and a column whose bottom bucket is 0 had no backdrop to draw at all.
   * Asserting the shaded x **equals the hovered x** catches both.
   */
  test("shades the hovered column and no other", async ({ page }) => {
    await openDashboard(page);
    const chart = safetyChart(page);

    for (const [columnX, index] of await columnSamples(chart)) {
      const box = await chart.locator(BAR).nth(index).boundingBox();
      expect(box).not.toBeNull();
      if (!box) continue;

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      await expect
        .poll(() =>
          chart
            .locator("rect.fill-muted")
            .evaluateAll((nodes) => [
              ...new Set(
                nodes.map((node) => Math.round(node.getBoundingClientRect().x))
              ),
            ])
        )
        .toEqual([columnX]);
    }
  });

  for (const { name, width, height } of BREAKPOINTS) {
    test(`draws the dashboard without horizontal scroll on ${name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await openDashboard(page);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

/**
 * **Production — 7-Day Trend**, checked against `iLine` (app-source.txt 482–497)
 * detail by detail.
 *
 * Every assertion here is for something the owner spotted by putting our screen
 * beside the prototype's, and none of it is reachable from jsdom: the key's
 * marker geometry, the panel's anchoring and the per-point dots are all layout.
 */
test.describe("Production trend chart", () => {
  /** The card, located by the prototype's own Title Case heading. */
  const trendCard = (page: Page): Locator =>
    page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Production — 7-Day Trend" });

  const openTrend = async (page: Page) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDashboard(page);
    await expect(
      page.getByText("Production — 7-Day Trend", { exact: true })
    ).toBeVisible(FIRST_PAINT);
  };

  /**
   * `iLine`'s key marker is `width:15, height:3` — a short line, because what it
   * labels is a line. Ours was an 8×8 square inherited from shadcn's shared
   * legend, which is what `iStackBar` uses for its *blocks*.
   */
  test("keys each series with a line, not a square", async ({ page }) => {
    await openTrend(page);

    const marker = trendCard(page)
      .locator('[data-slot="chart-key-item"]')
      .filter({ hasText: "ADP (MM)" })
      .locator('[data-slot="chart-key-marker"]');

    await expect(marker).toBeVisible();

    const box = await marker.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box?.width ?? 0)).toBe(15);
    expect(Math.round(box?.height ?? 0)).toBe(3);
  });

  /** The key precedes the plot — `marginBottom:10` on a div before the SVG. */
  test("puts the key above the plot, at its left edge", async ({ page }) => {
    await openTrend(page);

    const card = trendCard(page);
    const key = card.locator('[data-slot="chart-key"]');
    const plot = card.locator("svg.recharts-surface").first();

    const keyBox = await key.boundingBox();
    const plotBox = await plot.boundingBox();
    expect(keyBox).not.toBeNull();
    expect(plotBox).not.toBeNull();

    // Above.
    expect((keyBox?.y ?? 0) + (keyBox?.height ?? 0)).toBeLessThanOrEqual(
      plotBox?.y ?? 0
    );
    /*
      Left-aligned with the plot itself, which is the comparison that means
      something. Both the card and its content slot report a *border* box, so
      measuring against either just re-reads `ui/card`'s 16px padding — that is
      what produced a 16px "failure" for a key that was already flush.
    */
    expect(Math.abs((keyBox?.x ?? 0) - (plotBox?.x ?? 0))).toBeLessThan(2);
  });

  /**
   * `circle r=1.1` at every reading (490). Without them a seven-point week reads
   * as a continuous curve and there is nothing to show where a reading was
   * actually taken.
   */
  test("marks every reading with a dot", async ({ page }) => {
    await openTrend(page);

    // 5 series × 7 days.
    await expect
      .poll(() => trendCard(page).locator(".recharts-dot").count())
      .toBe(35);
  });

  /**
   * Two things at once, both reported by the owner from the screenshot: the
   * panel is pinned to the top of the plot (`top:2`) rather than floating over
   * the lines, and each row is one run of text (`name + ': ' + value`) rather
   * than a name and a right-aligned value column that collided at five series.
   */
  test("anchors the hover panel at the top and writes one run of text", async ({
    page,
  }) => {
    await openTrend(page);

    const card = trendCard(page);
    const plot = card.locator("svg.recharts-surface").first();
    const plotBox = await plot.boundingBox();
    expect(plotBox).not.toBeNull();

    // Mid-plot, so the panel has room to be wrong in either direction.
    await page.mouse.move(
      (plotBox?.x ?? 0) + (plotBox?.width ?? 0) / 2,
      (plotBox?.y ?? 0) + (plotBox?.height ?? 0) / 2
    );

    const panel = card.locator(".recharts-tooltip-wrapper");
    await expect(panel).toBeVisible();

    // "ADP (MM): 45" — colon-separated, one text node per row.
    await expect(panel.getByText(/^ADP \(MM\): \d/)).toBeVisible();

    // Pinned near the plot's top edge, not at the pointer (mid-plot, ~90px down).
    const panelBox = await panel.boundingBox();
    expect((panelBox?.y ?? 0) - (plotBox?.y ?? 0)).toBeLessThan(20);
  });

  /**
   * The panel must stay inside the card. `ui/card` is `overflow-hidden`, so a
   * panel allowed past the right edge is sheared rather than floated — which is
   * what pinning the tooltip's `x` used to cause, because Recharts skips its edge
   * clamping for any axis given an explicit position.
   */
  test("keeps the hover panel inside the card at the last point", async ({
    page,
  }) => {
    await openTrend(page);

    const card = trendCard(page);

    const plot = card.locator("svg.recharts-surface").first();
    const plotBox = await plot.boundingBox();
    expect(plotBox).not.toBeNull();

    const panel = card.locator(".recharts-tooltip-wrapper");

    /*
      Walk inward from the right edge until the panel opens, then assert on that
      point. Recharts' hit area stops short of the surface's edge, so a fixed
      "4px from the right" produced no tooltip at all — a test artefact, not the
      clipping this exists to catch. Walking finds the genuinely rightmost
      hoverable x, which is the worst case for overflow and the only one worth
      measuring.
    */
    let opened = false;
    for (let inset = 2; inset <= 60 && !opened; inset += 4) {
      await page.mouse.move(
        (plotBox?.x ?? 0) + (plotBox?.width ?? 0) - inset,
        (plotBox?.y ?? 0) + (plotBox?.height ?? 0) / 2
      );
      opened = await panel.isVisible();
    }
    expect(opened).toBe(true);

    const panelBox = await panel.boundingBox();
    const cardBox = await card.boundingBox();
    expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(
      (cardBox?.x ?? 0) + (cardBox?.width ?? 0) + 1
    );
  });
});
