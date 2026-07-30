import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LOGOUT_EPOCH_KEY,
  broadcastLogout,
  sessionTokenStorage,
} from "@/lib/auth/tokenStorage";

const KEY = "elogbook-auth";

describe("sessionTokenStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a value through sessionStorage", () => {
    sessionTokenStorage.setItem(KEY, "token-1");

    expect(sessionTokenStorage.getItem(KEY)).toBe("token-1");
    expect(sessionStorage.getItem(KEY)).toBe("token-1");
  });

  it("returns null for a key that was never written", () => {
    expect(sessionTokenStorage.getItem(KEY)).toBeNull();
  });

  it("removes a value", () => {
    sessionTokenStorage.setItem(KEY, "token-1");
    sessionTokenStorage.removeItem(KEY);

    expect(sessionTokenStorage.getItem(KEY)).toBeNull();
  });

  it("never writes the token to localStorage", () => {
    sessionTokenStorage.setItem(KEY, "token-1");

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  describe("without a window (server render)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    it("reads null instead of touching storage", () => {
      expect(sessionTokenStorage.getItem(KEY)).toBeNull();
    });

    it("writes nothing", () => {
      sessionTokenStorage.setItem(KEY, "token-1");

      vi.unstubAllGlobals();
      expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("removes nothing and does not throw", () => {
      expect(() => sessionTokenStorage.removeItem(KEY)).not.toThrow();
    });
  });
});

describe("broadcastLogout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes a timestamp to the one key sibling tabs listen on", () => {
    const before = Date.now();
    broadcastLogout();

    const epoch = localStorage.getItem(LOGOUT_EPOCH_KEY);
    expect(epoch).not.toBeNull();
    expect(Number(epoch)).toBeGreaterThanOrEqual(before);
  });

  it("puts nothing but the timestamp in localStorage", () => {
    broadcastLogout();

    expect(Object.keys(localStorage)).toEqual([LOGOUT_EPOCH_KEY]);
  });

  it("does nothing on the server", () => {
    vi.stubGlobal("window", undefined);
    broadcastLogout();

    vi.unstubAllGlobals();
    expect(localStorage.getItem(LOGOUT_EPOCH_KEY)).toBeNull();
  });
});
