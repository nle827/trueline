import { describe, expect, it } from "vitest";
import { planMove, type MoveContext } from "./board";
import { changeOrder, estimateDoc, invoiceDoc, payment, totalsOf } from "./testFixtures";

const ctx = (over: Partial<MoveContext> = {}): MoveContext => ({
  stage: "scheduled",
  doc: estimateDoc({ status: "signed" }),
  changeOrders: [],
  payments: [],
  totals: totalsOf(100000),
  ...over,
});

describe("board moves", () => {
  it("allows forward moves of any distance once sold", () => {
    expect(planMove(ctx(), "punch_list")).toMatchObject({ ok: true, value: { direction: "forward", effect: "none" } });
  });

  it("blocks moving past Estimating without a signed estimate", () => {
    const r = planMove(ctx({ stage: "estimating", doc: estimateDoc({ status: "sent" }) }), "sold");
    expect(r.ok).toBe(false);
  });

  it("blocks every move while an adjustment is pending", () => {
    const r = planMove(ctx({ changeOrders: [changeOrder()] }), "in_progress");
    expect(!r.ok && r.reason).toContain("Add closet");
  });

  it("converts the estimate when the job enters Invoiced", () => {
    expect(planMove(ctx({ stage: "punch_list" }), "invoiced")).toMatchObject({ ok: true, value: { effect: "convert_to_invoice" } });
  });

  it("only closes paid-in-full invoices", () => {
    const base = ctx({ stage: "invoiced", doc: invoiceDoc() });
    expect(planMove(base, "closed").ok).toBe(false);
    expect(planMove({ ...base, payments: [payment(100000)] }, "closed").ok).toBe(true);
  });

  it("moves back one stage at a time and asks for a reason", () => {
    expect(planMove(ctx({ stage: "in_progress" }), "sold").ok).toBe(false);
    expect(planMove(ctx({ stage: "in_progress" }), "scheduled")).toMatchObject({ ok: true, value: { needsReason: true } });
  });

  it("reverts an unpaid invoice when moving back to Punch List", () => {
    const base = ctx({ stage: "invoiced", doc: invoiceDoc() });
    expect(planMove(base, "punch_list")).toMatchObject({ ok: true, value: { effect: "revert_to_estimate" } });
    expect(planMove({ ...base, payments: [payment(100)] }, "punch_list").ok).toBe(false);
  });

  it("keeps closed jobs and signed estimates in place", () => {
    expect(planMove(ctx({ stage: "closed" }), "invoiced").ok).toBe(false);
    expect(planMove(ctx({ stage: "sold" }), "estimating").ok).toBe(false);
  });
});
