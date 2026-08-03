import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { getQueryClient } from "@/lib/query-client";

afterEach(() => {
  cleanup();
  localStorage.clear();
  // `renderWithProviders` renders through the production singleton, so it has
  // to be emptied between tests or one test's cached `/me` answers the next.
  getQueryClient().clear();
});

// jsdom implements neither, and both are read during theme setup and Base UI
// layout. (This style is base-nova, built on Base UI — there is no Radix here.)
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * A real class, not `vi.fn().mockImplementation(() => ({…}))`.
 *
 * The factory form returns a plain object, so `new ResizeObserver(cb)` threw
 * *"is not a constructor"*. Nothing exercised it until Recharts arrived —
 * `ResponsiveContainer` constructs one — so the mock had been quietly wrong
 * since it was written.
 *
 * The callback is retained and invoked once with a non-zero contentRect on
 * `observe`. Recharts renders nothing at all until it has been told a size, and
 * jsdom reports every element as 0×0, so a silent no-op observer produces an
 * empty chart and a suite full of "unable to find" failures that look like
 * component bugs.
 */
if (!window.ResizeObserver) {
  /*
    Both sides of this stub are load-bearing, so it satisfies both.

    **A real class, on both globals.** `@dnd-kit/core`
    (`features/dashboard-builder`) calls `new ResizeObserver(...)` directly off
    the global rather than through `window.`, and floating-ui's `autoUpdate`
    (behind `Popover`) does the same — a `vi.fn()` or an arrow function returned
    from a mock implementation is not reliably usable as a constructor in every
    environment this suite runs in.

    **`observe` reports a non-zero size.** jsdom measures every element as 0×0,
    and Recharts draws nothing at zero — so a stub whose `observe` is inert left
    every chart empty and made the chart suites assert against a blank SVG. One
    synchronous callback with 640×320 is what gives them a canvas to draw on.
  */
  class ResizeObserverStub {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width: 640, height: 320 } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this
      );
    }

    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverStub;
  globalThis.ResizeObserver = ResizeObserverStub;
}
