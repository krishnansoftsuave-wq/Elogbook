import { describe, expect, it } from "vitest";

import { MAX_RETURN_TO_LENGTH, safeReturnTo } from "@/lib/auth/returnTo";

/** A tab, written as an escape so the source stays plain ASCII. */
const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);

describe("safeReturnTo", () => {
  it("accepts a same-origin path with a query string", () => {
    expect(safeReturnTo("/logbook/add?x=1")).toBe("/logbook/add?x=1");
  });

  it("accepts the other real destinations the app redirects to", () => {
    expect(safeReturnTo("/logbook")).toBe("/logbook");
    expect(safeReturnTo("/admin/users")).toBe("/admin/users");
    expect(safeReturnTo("/admin/users/edit/42?tab=roles#top")).toBe(
      "/admin/users/edit/42?tab=roles#top"
    );
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeReturnTo("//evil.com")).toBeNull();
    expect(safeReturnTo("//evil.com/logbook")).toBeNull();
  });

  it("rejects a backslash-prefixed path", () => {
    // The live hole in the guard this replaces: it checked `//` only, while
    // `new URL("/\\evil.com", origin)` resolves to `http://evil.com/`.
    expect(safeReturnTo(`/${BACKSLASH}evil.com`)).toBeNull();
    expect(safeReturnTo(`/${BACKSLASH}${BACKSLASH}evil.com`)).toBeNull();
    expect(safeReturnTo(`${BACKSLASH}/evil.com`)).toBeNull();
  });

  it("rejects an absolute URL", () => {
    expect(safeReturnTo("https://evil.com")).toBeNull();
    expect(safeReturnTo("http://evil.com/logbook")).toBeNull();
  });

  it("rejects a percent-encoded escape", () => {
    expect(safeReturnTo("%2F%2Fevil.com")).toBeNull();
    // Survives the first pass — it decodes to `///evil.com`, which resolves
    // off-origin exactly as `//evil.com` does.
    expect(safeReturnTo("/%2f%2fevil.com")).toBeNull();
    expect(safeReturnTo("/%2F%2Fevil.com")).toBeNull();
  });

  it("rejects a javascript: or data: payload", () => {
    expect(safeReturnTo("javascript:alert(1)")).toBeNull();
    expect(safeReturnTo("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects a value the URL parser would strip back into an escape", () => {
    // Tabs and newlines are removed before the URL is resolved, so these
    // become `//evil.com` in the browser.
    expect(safeReturnTo(`/${TAB}/evil.com`)).toBeNull();
    expect(safeReturnTo(`/${NEWLINE}/evil.com`)).toBeNull();
  });

  it("rejects malformed percent-encoding rather than throwing", () => {
    expect(() => safeReturnTo("/logbook%E0%A4%A")).not.toThrow();
    expect(safeReturnTo("/logbook%E0%A4%A")).toBeNull();
  });

  it("rejects a relative path that never leaves the query string", () => {
    expect(safeReturnTo("logbook")).toBeNull();
    expect(safeReturnTo("../admin/users")).toBeNull();
    expect(safeReturnTo("")).toBeNull();
  });

  it("rejects anything that is not a string", () => {
    expect(safeReturnTo(undefined)).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(42)).toBeNull();
    // `?returnTo=a&returnTo=b` hands some parsers an array.
    expect(safeReturnTo(["/logbook"])).toBeNull();
  });

  it("rejects a value past the length cap", () => {
    const atCap = `/${"a".repeat(MAX_RETURN_TO_LENGTH - 1)}`;
    expect(safeReturnTo(atCap)).toBe(atCap);
    expect(safeReturnTo(`${atCap}a`)).toBeNull();
  });
});
