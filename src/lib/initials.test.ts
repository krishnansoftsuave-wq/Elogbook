import { describe, expect, it } from "vitest";

import { initialsOf } from "@/lib/initials";

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Said Al-Busaidi")).toBe("SA");
    expect(initialsOf("Maryam Al-Zadjali")).toBe("MA");
    expect(initialsOf("Ahmed Bin Rashid Al Harthy")).toBe("AB");
  });

  it("falls back to the first two characters of a single word", () => {
    expect(initialsOf("Said")).toBe("SA");
    expect(initialsOf("A")).toBe("A");
  });

  it("survives the inputs a display name should never be but might", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("  ".slice(0, 2).toUpperCase());
  });

  it("collapses runs of whitespace rather than reading one as a word", () => {
    expect(initialsOf("Said    Al-Busaidi")).toBe("SA");
    expect(initialsOf("Said\tAl-Busaidi")).toBe("SA");
  });

  /**
   * Non-Latin names produce something that is not a conventional abbreviation,
   * and that is accepted rather than special-cased: every caller renders this
   * `aria-hidden` beside the full display name, so it is a stable decoration and
   * never the accessible name. NFR-07 makes Arabic first-class, and the
   * alternative — dropping the avatar for Arabic names — would be worse.
   */
  it("does not throw on a non-Latin name", () => {
    expect(() => initialsOf("سعيد البوسعيدي")).not.toThrow();
    expect(initialsOf("سعيد البوسعيدي")).toHaveLength(2);
  });
});
