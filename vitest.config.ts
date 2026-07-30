import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Vite resolves the `@/*` aliases from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Playwright owns e2e; vitest must not try to run those specs.
    exclude: ["node_modules", ".next", "e2e"],
    // Each worker instantiates its own jsdom, which is memory-hungry. Left
    // unbounded, vitest spawns one per core and the whole run dies with
    // "Vitest failed to find the current suite" on any machine short of free
    // RAM — every file fails, no test actually executes. Capping workers does
    // not skip or weaken a single test: all of them still run.
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/components/ui/**",
        "src/test/**",
        "src/app/**/layout.tsx",
      ],
    },
  },
});
