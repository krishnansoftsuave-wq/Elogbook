import { describe, expect, it } from "vitest";

import { findMockAccount } from "@/mocks/auth/directory";
import { actor, PEOPLE, SEEDABLE_PEOPLE } from "@/mocks/data/people";
import { mockStore, resetMockStore } from "@/mocks/store";

/**
 * The point of this file: every person named anywhere in the fixtures must be an
 * account you can actually sign in as.
 *
 * The prototype's records are authored by "A. Harthy", "S. Balushi", "K. Said"
 * — names that exist in no directory. Ported verbatim, the demo would show you
 * actions raised by people who do not exist, assigned to owners you can never
 * be, and a notification matrix listing users who cannot log in. That is the
 * class of bug this catches.
 */
describe("PEOPLE", () => {
  it("names only real directory accounts", () => {
    for (const username of SEEDABLE_PEOPLE) {
      expect(findMockAccount(username)).toBeDefined();
    }
  });

  it("covers all five base roles plus the multi-role account", () => {
    expect(Object.keys(PEOPLE)).toEqual([
      "OPERATOR",
      "SUPERVISOR",
      "MANAGEMENT",
      "ADMINISTRATOR",
      "SUPER_USER",
      "MULTI_ROLE",
    ]);
  });

  it("excludes the unmapped account, which can hold no records", () => {
    expect(SEEDABLE_PEOPLE).not.toContain("hamed.alsiyabi");
  });
});

describe("actor", () => {
  it("resolves a username to its directory display name", () => {
    expect(actor(PEOPLE.OPERATOR)).toEqual({
      username: "said.albusaidi",
      display_name: "Said Al-Busaidi",
    });
  });

  /**
   * Throws rather than falling back to the username: a fixture naming a
   * non-existent account is an authoring mistake, and a silent fallback would
   * put a fake person in front of the client.
   */
  it("throws for an account that does not exist", () => {
    expect(() => actor("a.harthy")).toThrow(/unknown account/i);
  });
});

describe("fixture identities", () => {
  it("uses real accounts for every actor the store seeds", () => {
    resetMockStore();
    const store = mockStore();

    const usernames = new Set<string>();

    for (const action of store.actions) {
      usernames.add(action.created_by.username);
      if (action.owner) usernames.add(action.owner.username);
    }
    for (const comment of store.actionComments) {
      usernames.add(comment.author.username);
    }
    for (const summary of store.summaries) {
      usernames.add(summary.generated_by.username);
      summary.comments.forEach((c) => usernames.add(c.author.username));
      summary.ai_confirmations.forEach((c) =>
        usernames.add(c.confirmed_by.username)
      );
    }
    for (const decision of store.decisions) {
      usernames.add(decision.raised_by.username);
      if (decision.owner) usernames.add(decision.owner.username);
      decision.notified.forEach((a) => usernames.add(a.username));
      decision.timeline.forEach((e) => usernames.add(e.actor.username));
      decision.comments.forEach((c) => usernames.add(c.author.username));
    }
    for (const request of store.requests) {
      usernames.add(request.submitted_by.username);
      request.remarks.forEach((r) => usernames.add(r.author.username));
    }
    for (const event of store.auditEvents) {
      if (event.actor) usernames.add(event.actor.username);
    }
    for (const row of store.notificationPermissions) {
      usernames.add(row.username);
    }

    expect(usernames.size).toBeGreaterThan(0);
    for (const username of usernames) {
      expect(
        findMockAccount(username),
        `fixture names "${username}", which is not a MOCK_ACCOUNTS identity`
      ).toBeDefined();
    }
  });

  it("keeps display names consistent with the directory", () => {
    resetMockStore();

    for (const action of mockStore().actions) {
      const account = findMockAccount(action.created_by.username);
      expect(action.created_by.display_name).toBe(account?.displayName);
    }
  });
});
