import { describe, expect, it } from "vitest";

import {
  actionCommentWireSchema,
  actionListResponseSchema,
  actionWireSchema,
  suggestionWireSchema,
  toAction,
  toActionComment,
  toSuggestion,
} from "@/features/actions/schemas";

const WIRE = {
  id: "ACT-2041",
  title: "Relief valve XV-118 set-pressure verification",
  area: "B-train",
  equipment: "XV-118",
  priority: "critical",
  status: "open",
  source: "ai_suggested",
  category: "safety",
  description: "Confirm set pressure and check for passing.",
  due_at: "2026-07-30T12:00:00+00:00",
  created_at: "2026-07-30T00:00:00+00:00",
  created_by: { username: "fatma.alharthy", display_name: "Fatma Al-Harthy" },
  owner: { username: "said.albusaidi", display_name: "Said Al-Busaidi" },
} as const;

describe("actionWireSchema", () => {
  it("accepts the documented wire shape", () => {
    expect(() => actionWireSchema.parse(WIRE)).not.toThrow();
  });

  it("accepts a null owner — FR-PA-05 leaves actions unassigned by default", () => {
    expect(() =>
      actionWireSchema.parse({ ...WIRE, owner: null })
    ).not.toThrow();
  });

  /**
   * The prototype's five-value status set is not FR-PA-04's. If a backend sent
   * `Overdue`, the parse must fail loudly rather than admitting a status the app
   * has no lifecycle for.
   */
  it("rejects the prototype's Overdue pseudo-status", () => {
    expect(() =>
      actionWireSchema.parse({ ...WIRE, status: "Overdue" })
    ).toThrow();
  });

  it("rejects a display-cased priority", () => {
    expect(() =>
      actionWireSchema.parse({ ...WIRE, priority: "Critical" })
    ).toThrow();
  });
});

describe("toAction", () => {
  it("maps every snake_case field to its camelCase counterpart", () => {
    const action = toAction(actionWireSchema.parse(WIRE));

    expect(action.dueAt).toBe(WIRE.due_at);
    expect(action.createdAt).toBe(WIRE.created_at);
    expect(action.createdBy).toEqual({
      username: "fatma.alharthy",
      displayName: "Fatma Al-Harthy",
    });
    expect(action.owner).toEqual({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
    });
  });

  it("carries a null owner through as null rather than an empty actor", () => {
    const action = toAction(actionWireSchema.parse({ ...WIRE, owner: null }));
    expect(action.owner).toBeNull();
  });

  /** The mapper is the single rename point; nothing should leak the wire spelling. */
  it("leaves no snake_case keys on the app-side object", () => {
    const action = toAction(actionWireSchema.parse(WIRE));
    for (const key of Object.keys(action)) {
      expect(key).not.toMatch(/_/);
    }
  });
});

describe("suggestion", () => {
  const SUGGESTION = {
    id: "AI-118",
    title: "Inspect XV-118 relief valve for passing",
    reason: "Compressor trip correlated with high vibration.",
    source_reference: "Night-shift log · 10 Jun 02:14",
    confidence: 92,
    area: "B-train",
    equipment: "XV-118",
    priority: "critical",
    confirmed: null,
  } as const;

  it("keeps confidence numeric so FR-AI-05 can be judged in the UI", () => {
    expect(
      toSuggestion(suggestionWireSchema.parse(SUGGESTION)).confidence
    ).toBe(92);
  });

  it("rejects a confidence outside 0–100", () => {
    expect(() =>
      suggestionWireSchema.parse({ ...SUGGESTION, confidence: 140 })
    ).toThrow();
  });

  it("starts unconfirmed — FR-PA-02 has a Supervisor decide", () => {
    expect(toSuggestion(suggestionWireSchema.parse(SUGGESTION)).confirmed).toBe(
      null
    );
  });
});

describe("toActionComment", () => {
  it("maps action_id and created_at", () => {
    const comment = toActionComment(
      actionCommentWireSchema.parse({
        id: "ACM-001",
        action_id: "ACT-2038",
        author: {
          username: "said.albusaidi",
          display_name: "Said Al-Busaidi",
        },
        body: "Alignment checked.",
        created_at: "2026-07-31T06:00:00+00:00",
      })
    );

    expect(comment.actionId).toBe("ACT-2038");
    expect(comment.createdAt).toBe("2026-07-31T06:00:00+00:00");
  });
});

describe("actionListResponseSchema", () => {
  it("requires the §3 envelope, not a bare list", () => {
    const page = { items: [WIRE], total: 1, page: 1, pageSize: 10 };

    expect(() => actionListResponseSchema.parse(page)).toThrow();
    expect(() =>
      actionListResponseSchema.parse({
        success: true,
        data: page,
        meta: {
          correlation_id: "0".repeat(32),
          timestamp: "2026-07-31T12:00:00+00:00",
        },
      })
    ).not.toThrow();
  });
});
