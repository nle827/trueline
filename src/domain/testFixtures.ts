import type { Totals } from "./estimate";
import type { ChangeOrder, JobDocument, Payment } from "./types";

export const NOW = "2026-10-20T15:00:00.000Z";

export const estimateDoc = (over: Partial<JobDocument> = {}): JobDocument => ({
  jobId: "j1",
  kind: "estimate",
  status: "draft",
  discount: 0,
  voidedInvoiceNumbers: [],
  ...over,
});

export const invoiceDoc = (over: Partial<JobDocument> = {}): JobDocument =>
  estimateDoc({ kind: "invoice", status: "signed", invoiceNumber: "INV-2001", ...over });

export const totalsOf = (total: number, over: Partial<Totals> = {}): Totals => ({
  byCategory: {
    material: { cost: 0, price: 0 },
    labor: { cost: 0, price: total },
    other: { cost: 0, price: 0 },
  },
  subtotal: total,
  adjustments: 0,
  discount: 0,
  tax: 0,
  total,
  cost: 0,
  ...over,
});

export const payment = (amount: number, id = "p1"): Payment => ({
  id,
  jobId: "j1",
  amount,
  method: "card",
  receivedAt: NOW,
});

export const changeOrder = (over: Partial<ChangeOrder> = {}): ChangeOrder => ({
  id: "c1",
  jobId: "j1",
  description: "Add closet",
  amount: 40000,
  status: "proposed",
  createdAt: NOW,
  ...over,
});
