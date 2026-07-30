const MIN_DELAY_MS = 120;
const MAX_DELAY_MS = 400;

/**
 * A little jitter so loading and pending states are actually observable in the
 * browser instead of resolving in the frame the request starts. A mock that
 * answers instantly hides exactly the states this app has to get right.
 *
 * Skipped under vitest: a few hundred milliseconds per call compounds across a
 * suite, and a delay that varies run to run buys flakiness for no coverage.
 */
export const mockLatency = async (): Promise<void> => {
  if (process.env.NODE_ENV === "test") return;

  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, delay));
};
