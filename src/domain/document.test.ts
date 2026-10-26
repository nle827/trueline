import { describe, expect, it } from "vitest";
import {
  balanceDue,
  convertToInvoice,
  decideChangeOrder,
  displayType,
  proposeChangeOrder,
  revertToEstimate,
  sendEstimate,
  signEstimate,
  validatePayment,
} from "./document";
import { computeTotals } from "./estimate";
import { changeOrder, estimateDoc, invoiceDoc, NOW, payment, totalsOf } from "./testFixtures";
import type { LineItem } from "./trades/types";

describe("totals", () => {
  const items: LineItem[] = [
    { id: "a", tradeId: "paint", category: "material", label: "Paint", qty: 1, unit: "gal", cost: 10000, price: 13000 },
    { id: "b", tradeId: "paint", category: "labor", label: "Roll", qty: 1, unit: "hr", cost: 20000, price: 32000 },
  ];

  it("taxes materials only and adds approved adjustments", () => {
    const t = computeTotals(items, { discount: 5000 }, [changeOrder({ status: "approved" }), changeOrder({ id: "c2" })], 0.1);
    expect(t.subtotal).toBe(45000);
    expect(t.tax).toBe(1300);
    expect(t.adjustments).toBe(40000); // the proposed one is ignored
    expect(t.total).toBe(45000 + 40000 - 5000 + 1300);
    expect(t.cost).toBe(30000);
  });

  it("caps the discount at the subtotal", () => {
    expect(computeTotals(items, { discount: 999999 }, [], 0).discount).toBe(45000);
  });
});

describe("estimate lifecycle", () => {
  it("needs line items before sending", () => {
    expect(sendEstimate(estimateDoc(), NOW, 0).ok).toBe(false);
    expect(sendEstimate(estimateDoc(), NOW, 3)).toMatchObject({ ok: true, value: { status: "sent" } });
  });

  it("can only be signed after it is sent", () => {
    expect(signEstimate(estimateDoc(), NOW).ok).toBe(false);
    expect(signEstimate(estimateDoc({ status: "sent" }), NOW)).toMatchObject({ ok: true, value: { status: "signed", signedAt: NOW } });
  });

  it("converts only a signed estimate and sets a due date", () => {
    expect(convertToInvoice(estimateDoc({ status: "sent" }), "INV-1", NOW, 15).ok).toBe(false);
    const r = convertToInvoice(estimateDoc({ status: "signed" }), "INV-1", NOW, 15);
    expect(r.ok && r.value.kind).toBe("invoice");
    expect(r.ok && r.value.dueAt).toBe("2026-11-04T15:00:00.000Z");
  });
});

describe("display type", () => {
  it("is Estimate, then Invoice, then Receipt once paid in full", () => {
    const t = totalsOf(100000);
    expect(displayType(estimateDoc({ status: "signed" }), t, [])).toBe("Estimate");
    expect(displayType(invoiceDoc(), t, [payment(40000)])).toBe("Invoice");
    expect(displayType(invoiceDoc(), t, [payment(40000), payment(60000, "p2")])).toBe("Receipt");
  });

  it("does not call a $0 invoice a receipt", () => {
    expect(displayType(invoiceDoc(), totalsOf(0), [])).toBe("Invoice");
  });
});

describe("revert", () => {
  it("returns an unpaid invoice to a signed estimate and voids the number", () => {
    const r = revertToEstimate(invoiceDoc(), [], "Punch list not finished");
    expect(r).toMatchObject({ ok: true, value: { kind: "estimate", status: "signed", invoiceNumber: undefined, voidedInvoiceNumbers: ["INV-2001"] } });
  });

  it("is blocked once a payment exists", () => {
    const r = revertToEstimate(invoiceDoc(), [payment(25000)], "Oops");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toContain("$250.00");
  });

  it("requires a reason", () => {
    expect(revertToEstimate(invoiceDoc(), [], " ").ok).toBe(false);
  });
});

describe("payments", () => {
  const t = totalsOf(100000);
  it("rejects payments on estimates, zero amounts, and overpayment", () => {
    expect(validatePayment(estimateDoc({ status: "signed" }), t, [], 100).ok).toBe(false);
    expect(validatePayment(invoiceDoc(), t, [], 0).ok).toBe(false);
    expect(validatePayment(invoiceDoc(), t, [payment(90000)], 20000).ok).toBe(false);
    expect(validatePayment(invoiceDoc(), t, [payment(90000)], 10000).ok).toBe(true);
  });

  it("derives the balance from payments", () => {
    expect(balanceDue(t, [payment(30000), payment(20000, "p2")])).toBe(50000);
  });
});

describe("change orders", () => {
  it("can only be proposed on a sold job", () => {
    expect(proposeChangeOrder(estimateDoc({ status: "sent" }), "Closet", 100).ok).toBe(false);
    expect(proposeChangeOrder(estimateDoc({ status: "signed" }), "Closet", -100).ok).toBe(true);
  });

  it("can only be decided once", () => {
    const approved = decideChangeOrder(changeOrder(), "approved", NOW);
    expect(approved.ok).toBe(true);
    expect(approved.ok && decideChangeOrder(approved.value, "rejected", NOW).ok).toBe(false);
  });
});
