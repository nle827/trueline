import { applyRate, dollars, type Cents } from "../money";
import type { Category, LineItem, Markups, TradeId } from "./types";

/**
 * Build a line item from a quantity and a unit cost in dollars.
 * Price = cost marked up by the category's rate. Zero-quantity lines are dropped by callers.
 */
export function makeLine(
  tradeId: TradeId,
  markups: Markups,
  category: Category,
  key: string,
  label: string,
  qty: number,
  unit: string,
  unitCostDollars: number,
): LineItem {
  const cost: Cents = dollars(qty * unitCostDollars);
  return {
    id: `${tradeId}:${key}`,
    tradeId,
    category,
    label,
    qty: Math.round(qty * 100) / 100,
    unit,
    cost,
    price: cost + applyRate(cost, markups[category]),
  };
}

export const nonZero = (items: LineItem[]) => items.filter((i) => i.qty > 0 && i.cost > 0);
