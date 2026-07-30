import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LEGACY_AUTH_COOKIES,
  SESSION_COOKIE,
  clearSessionCookie,
  serializeCookie,
  writeSessionCookie,
} from "@/lib/auth/sessionCookie";

const expireAll = () => {
  for (const name of [SESSION_COOKIE, ...LEGACY_AUTH_COOKIES]) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
};

describe("serializeCookie", () => {
  it("omits Max-Age so the marker dies with the browser session", () => {
    expect(serializeCookie(SESSION_COOKIE, "1", { secure: false })).toBe(
      "elogbook_session=1; Path=/; SameSite=Lax"
    );
  });

  it("adds Secure over https", () => {
    expect(serializeCookie(SESSION_COOKIE, "1", { secure: true })).toBe(
      "elogbook_session=1; Path=/; SameSite=Lax; Secure"
    );
  });

  it("expires a cookie with Max-Age=0", () => {
    expect(
      serializeCookie("elogbook_role", "", { maxAge: 0, secure: false })
    ).toBe("elogbook_role=; Path=/; Max-Age=0; SameSite=Lax");
  });
});

describe("writeSessionCookie", () => {
  beforeEach(expireAll);
  afterEach(() => {
    // Restore `document` first — the stubbed-out server case has none to clear.
    vi.unstubAllGlobals();
    expireAll();
  });

  it("writes a presence marker and nothing secret", () => {
    writeSessionCookie();

    expect(document.cookie).toContain(`${SESSION_COOKIE}=1`);
  });

  it("never writes the token or the role to a cookie", () => {
    writeSessionCookie();

    for (const name of LEGACY_AUTH_COOKIES) {
      expect(document.cookie).not.toContain(`${name}=`);
    }
  });

  it("does nothing without a document (server render)", () => {
    vi.stubGlobal("document", undefined);

    expect(() => writeSessionCookie()).not.toThrow();
  });
});

describe("clearSessionCookie", () => {
  beforeEach(expireAll);
  afterEach(() => {
    vi.unstubAllGlobals();
    expireAll();
  });

  it("expires the presence marker", () => {
    writeSessionCookie();
    clearSessionCookie();

    expect(document.cookie).not.toContain(`${SESSION_COOKIE}=1`);
  });

  it("expires the role and token cookies the old scaffold left behind", () => {
    document.cookie = "elogbook_token=stale-bearer-token; Path=/";
    document.cookie = "elogbook_role=administrator; Path=/";

    clearSessionCookie();

    expect(document.cookie).not.toContain("stale-bearer-token");
    expect(document.cookie).not.toContain("administrator");
  });

  it("does nothing without a document (server render)", () => {
    vi.stubGlobal("document", undefined);

    expect(() => clearSessionCookie()).not.toThrow();
  });
});
