import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  /**
   * **One worker, everywhere — because every spec shares one mock store.**
   *
   * `src/mocks/store.ts` pins its state to `globalThis` in the single `next dev`
   * process all workers talk to, so parallel files are not isolated from each
   * other in the way `fullyParallel` implies. Two concrete collisions, both
   * observed rather than theorised:
   *
   * - `e2e/supervisor.spec.ts` asserts the *disabled* state of the very workflow
   *   toggle `e2e/admin.spec.ts` enables. One singleton, two owners.
   * - Both files call `POST /dev/reset` in `beforeAll` to be idempotent, and
   *   that reset wipes rows the other file just wrote.
   *
   * No test-side discipline fixes either — each file is already serial
   * internally, asserts on named records rather than counts, and restores what
   * it changes. CI was always `workers: 1`; this makes a local run mean the same
   * thing, at the cost of wall-clock. Owner decision, 2026-08-01.
   *
   * The alternative — keying the store off a per-worker header so each worker
   * gets its own — was considered and declined as complexity in a file every
   * mock handler reads.
   */
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
