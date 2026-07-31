import { beforeEach, describe, expect, it } from "vitest";

import { actionWireSchema } from "@/features/actions/schemas";
import { workflowWireSchema } from "@/features/admin/schemas";
import { auditEventWireSchema } from "@/features/audit/schemas";
import { decisionWireSchema } from "@/features/decisions/schemas";
import { notificationWireSchema } from "@/features/notifications/schemas";
import { requestWireSchema } from "@/features/requests/schemas";
import { summaryWireSchema } from "@/features/summaries/schemas";
import {
  appendAuditEvent,
  findById,
  isWorkflowEnabled,
  mockStore,
  nextId,
  patchById,
  resetMockStore,
} from "@/mocks/store";

beforeEach(() => {
  resetMockStore();
});

describe("seed integrity", () => {
  /**
   * The seed is typed against the wire schemas, so this cannot drift at compile
   * time — but a schema refinement (a `min`, a regex) is only enforced at parse
   * time, and this is what catches a fixture that satisfies the type and
   * violates the contract.
   */
  it("seeds records that satisfy the schemas the client parses", () => {
    const store = mockStore();

    for (const action of store.actions) {
      expect(() => actionWireSchema.parse(action)).not.toThrow();
    }
    for (const summary of store.summaries) {
      expect(() => summaryWireSchema.parse(summary)).not.toThrow();
    }
    for (const notification of store.notifications) {
      expect(() => notificationWireSchema.parse(notification)).not.toThrow();
    }
    for (const decision of store.decisions) {
      expect(() => decisionWireSchema.parse(decision)).not.toThrow();
    }
    for (const request of store.requests) {
      expect(() => requestWireSchema.parse(request)).not.toThrow();
    }
    for (const workflow of store.workflows) {
      expect(() => workflowWireSchema.parse(workflow)).not.toThrow();
    }
    for (const event of store.auditEvents) {
      expect(() => auditEventWireSchema.parse(event)).not.toThrow();
    }
  });

  it("ports all fourteen prototype actions", () => {
    expect(mockStore().actions).toHaveLength(14);
  });

  /**
   * The correction this whole phase turns on. FR-PA-05 and §6.2(a) make
   * assignment and tracking opt-in; §6.3(a) makes decisions record-only. The
   * prototype's `state` seeds three of the four `true`, while its own admin cards
   * print `Default: OFF`. If someone "fixes" the seed to match the prototype's
   * state, this fails.
   */
  it("seeds every workflow toggle OFF (FR-PA-05, §6.2(a), §6.3(a))", () => {
    for (const workflow of mockStore().workflows) {
      expect(workflow.enabled).toBe(false);
    }
    expect(isWorkflowEnabled("supervisor_action_workflow")).toBe(false);
    expect(isWorkflowEnabled("management_decision_workflow")).toBe(false);
    expect(isWorkflowEnabled("operator_comment_permission")).toBe(false);
    expect(isWorkflowEnabled("predictive_insights")).toBe(false);
  });

  it("never stores a colour — no C-palette hex survives into data", () => {
    const serialised = JSON.stringify(mockStore());
    expect(serialised).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  /** The `Overdue` pseudo-status must not have been ported. */
  it("stores only FR-PA-04 statuses", () => {
    for (const action of mockStore().actions) {
      expect(action.status).not.toBe("Overdue");
      expect(() =>
        actionWireSchema.shape.status.parse(action.status)
      ).not.toThrow();
    }
  });

  it("still produces overdue actions for the demo, via past due dates", () => {
    const now = Date.now();
    const overdue = mockStore().actions.filter(
      (action) =>
        Date.parse(action.due_at) < now &&
        !["completed", "cancelled", "verified"].includes(action.status)
    );
    expect(overdue.length).toBeGreaterThan(0);
  });
});

describe("resetMockStore", () => {
  /**
   * The discipline the mutable store costs. Route handler tests import handlers
   * directly and share one process, so a write in one test would otherwise be
   * visible in the next.
   */
  it("undoes writes made by a previous test", () => {
    patchById(mockStore().actions, "ACT-2041", { status: "verified" });
    expect(findById(mockStore().actions, "ACT-2041")?.status).toBe("verified");

    resetMockStore();

    expect(findById(mockStore().actions, "ACT-2041")?.status).toBe("open");
  });

  it("hands back a fresh object graph, not a shared reference", () => {
    const before = mockStore();
    resetMockStore();
    expect(mockStore()).not.toBe(before);
  });
});

describe("patchById", () => {
  it("returns the updated record and writes it back into the collection", () => {
    const updated = patchById(mockStore().actions, "ACT-2038", {
      status: "completed",
    });

    expect(updated?.status).toBe("completed");
    expect(findById(mockStore().actions, "ACT-2038")?.status).toBe("completed");
  });

  it("replaces rather than mutating in place", () => {
    const before = findById(mockStore().actions, "ACT-2038");
    patchById(mockStore().actions, "ACT-2038", { status: "completed" });

    // The old object is untouched — a stale reference cannot silently observe
    // the new value.
    expect(before?.status).toBe("in_progress");
  });

  it("leaves unpatched fields alone", () => {
    const before = findById(mockStore().actions, "ACT-2038");
    const updated = patchById(mockStore().actions, "ACT-2038", {
      status: "completed",
    });

    expect(updated?.title).toBe(before?.title);
    expect(updated?.priority).toBe(before?.priority);
  });

  it("returns null for an id that does not exist", () => {
    expect(patchById(mockStore().actions, "ACT-0000", { status: "open" })).toBe(
      null
    );
  });
});

describe("audit trail", () => {
  it("is append-only — there is no update or delete helper exported", async () => {
    const store = await import("@/mocks/store");

    expect(store).toHaveProperty("appendAuditEvent");
    expect(store).not.toHaveProperty("updateAuditEvent");
    expect(store).not.toHaveProperty("deleteAuditEvent");
    expect(store).not.toHaveProperty("clearAuditEvents");
  });

  it("appends without disturbing what is already recorded", () => {
    const before = mockStore().auditEvents.length;

    appendAuditEvent({
      id: nextId("AUD"),
      occurred_at: "2026-07-31T12:00:00+00:00",
      actor: null,
      role_label: "System",
      action: "RETENTION_PURGE",
      target: "test",
      result: "success",
    });

    expect(mockStore().auditEvents).toHaveLength(before + 1);
  });
});

describe("nextId", () => {
  it("does not repeat within a process", () => {
    const ids = Array.from({ length: 50 }, () => nextId("TST"));
    expect(new Set(ids).size).toBe(50);
  });
});
