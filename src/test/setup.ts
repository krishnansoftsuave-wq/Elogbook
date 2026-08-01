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

if (!window.ResizeObserver) {
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}
