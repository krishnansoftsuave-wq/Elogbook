import { describe, expect, it } from "vitest";

import {
  SUMMARY_SECTION_KINDS,
  summaryWireSchema,
  toSummary,
} from "@/features/summaries/schemas";

const ACTOR = {
  username: "said.albusaidi",
  display_name: "Said Al-Busaidi",
} as const;

const WIRE = {
  id: "SUM-20260731-D",
  shift_id: "20260731-D",
  name: "Day Shift – 31 Jul 2026",
  window_label: "Day (06:00–18:00)",
  shift_date: "20260731",
  generated_at: "2026-07-31T18:05:00+00:00",
  generated_by: ACTOR,
  generated_by_role: "Operator",
  generation: "end_of_shift",
  sections: [
    {
      kind: "critical_alarms",
      items: [
        {
          text: "B-train compressor trip at 02:14",
          severity: "critical",
          record_id: "ELB-20250610-0042",
        },
      ],
    },
  ],
  comments: [
    {
      id: "SCM-001",
      author: ACTOR,
      body: "Restart confirmed.",
      created_at: "2026-07-31T14:45:00+00:00",
    },
  ],
  ai_confirmations: [
    {
      id: "AIC-001",
      suggestion_id: "AI-118",
      title: "Inspect relief valve XV-118",
      confirmed_by: ACTOR,
      confirmed_at: "2026-07-31T14:30:00+00:00",
      comment: "Coordinate with maintenance.",
    },
  ],
} as const;

describe("summary sections", () => {
  /** FR-SUM-01 names exactly four, and the prototype renders exactly four. */
  it("is FR-SUM-01's four sections", () => {
    expect(SUMMARY_SECTION_KINDS).toEqual([
      "activities",
      "critical_alarms",
      "pending_actions",
      "safety_observations",
    ]);
  });

  it("rejects a section kind outside the client template", () => {
    expect(() =>
      summaryWireSchema.parse({
        ...WIRE,
        sections: [{ kind: "housekeeping", items: [] }],
      })
    ).toThrow();
  });

  /**
   * The prototype stores a hex per item (`'#C0392B'`). Severity replaces it so
   * colour stays a render-time theme decision and dark mode works.
   */
  it("takes a severity token, never a colour", () => {
    expect(() =>
      summaryWireSchema.parse({
        ...WIRE,
        sections: [
          {
            kind: "activities",
            items: [{ text: "x", severity: "#C0392B", record_id: "ELB-1" }],
          },
        ],
      })
    ).toThrow();
  });
});

describe("toSummary", () => {
  it("maps the nested record_id — FR-SUM-06's source reference", () => {
    const summary = toSummary(summaryWireSchema.parse(WIRE));
    expect(summary.sections[0]?.items[0]?.recordId).toBe("ELB-20250610-0042");
  });

  it("maps nested actors on comments and confirmations", () => {
    const summary = toSummary(summaryWireSchema.parse(WIRE));

    expect(summary.comments[0]?.author).toEqual({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
    });
    expect(summary.aiConfirmations[0]?.confirmedBy).toEqual({
      username: "said.albusaidi",
      displayName: "Said Al-Busaidi",
    });
  });

  it("maps every top-level snake_case field", () => {
    const summary = toSummary(summaryWireSchema.parse(WIRE));

    expect(summary.shiftId).toBe("20260731-D");
    expect(summary.windowLabel).toBe("Day (06:00–18:00)");
    expect(summary.shiftDate).toBe("20260731");
    expect(summary.generatedAt).toBe("2026-07-31T18:05:00+00:00");
    expect(summary.generatedByRole).toBe("Operator");
  });

  it("leaves no snake_case keys on the app-side object", () => {
    const summary = toSummary(summaryWireSchema.parse(WIRE));
    for (const key of Object.keys(summary)) {
      expect(key).not.toMatch(/_/);
    }
  });
});

describe("ai_confirmations", () => {
  /**
   * NFR-12 — "no duplicate records". Without `suggestion_id` a repeated confirm
   * cannot be recognised as the same one and appends a second entry.
   */
  it("ties each confirmation back to the suggestion it records", () => {
    const summary = toSummary(summaryWireSchema.parse(WIRE));
    expect(summary.aiConfirmations[0]?.suggestionId).toBe("AI-118");
  });

  it("rejects a confirmation with no suggestion_id", () => {
    const { suggestion_id, ...withoutSource } = WIRE.ai_confirmations[0];
    void suggestion_id;

    expect(() =>
      summaryWireSchema.parse({ ...WIRE, ai_confirmations: [withoutSource] })
    ).toThrow();
  });
});

describe("FR-SUM-04 — no approval gate", () => {
  /**
   * "Allow any authorised user to create a summary **without a mandatory
   * approval gate**." A schema that grew an `approved_by` or `approval_status`
   * field would be the first step toward building the gate the BRD rules out.
   */
  it("has no approval field anywhere in the shape", () => {
    const keys = Object.keys(summaryWireSchema.shape);
    expect(keys).not.toContain("approved_by");
    expect(keys).not.toContain("approval_status");
    expect(keys).not.toContain("approved_at");
  });
});
