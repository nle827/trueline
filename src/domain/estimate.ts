import { applyRate, sum, type Cents } from "./money";
import { CATEGORIES, type Category, type LineItem } from "./trades/types";
import type { ChangeOrder, JobDocument } from "./types";

export interface CategoryTotal {
  cost: Cents;
  price: Cents;
}

export interface Totals {
  byCategory: Record<Category, CategoryTotal>;
  subtotal: Cents; // price of all line items
  adjustments: Cents; // approved change orders
  discount: Cents;
  tax: Cents; // on material price only
  total: Cents;
  cost: Cents; // forecast cost of all line items
}

export function categoryTotals(items: LineItem[]): Record<Category, CategoryTotal> {
  const out = {} as Record<Category, CategoryTotal>;
  for (const c of CATEGORIES) {
    const inCat = items.filter((i) => i.category === c);
    out[c] = { cost: sum(inCat.map((i) => i.cost)), price: sum(inCat.map((i) => i.price)) };
  }
  return out;
}

export const approvedAdjustments = (changeOrders: ChangeOrder[]): Cents =>
  sum(changeOrders.filter((c) => c.status === "approved").map((c) => c.amount));

export function computeTotals(
  items: LineItem[],
  doc: Pick<JobDocument, "discount">,
  changeOrders: ChangeOrder[],
  taxRate: number,
): Totals {
  const byCategory = categoryTotals(items);
  const subtotal = sum(CATEGORIES.map((c) => byCategory[c].price));
  const adjustments = approvedAdjustments(changeOrders);
  const discount = Math.min(doc.discount, subtotal);
  const tax = applyRate(byCategory.material.price, taxRate);
  return {
    byCategory,
    subtotal,
    adjustments,
    discount,
    tax,
    total: subtotal + adjustments - discount + tax,
    cost: sum(CATEGORIES.map((c) => byCategory[c].cost)),
  };
}
