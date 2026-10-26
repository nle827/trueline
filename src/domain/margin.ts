import { applyRate, percentOf, sum, type Cents } from "./money";
import type { Totals } from "./estimate";
import { CATEGORIES, type Category, type LineItem, type TradeId } from "./trades/types";
import type { ActualCost, MarginTarget, Role } from "./types";

/** How far actual cost can run over forecast before it counts as an overrun. */
export const OVERRUN_TOLERANCE = 0.03;

/** Latest target for a trade that was in effect on `asOf`. */
export function targetFor(tradeId: TradeId, targets: MarginTarget[], asOf: string): number | undefined {
  return targets
    .filter((t) => t.tradeId === tradeId && t.effectiveFrom <= asOf)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.percent;
}

/** A job's target is each trade's target weighted by how much of the price that trade makes up. */
export function blendedTarget(items: LineItem[], targets: MarginTarget[], asOf: string): number {
  const byTrade = new Map<TradeId, Cents>();
  for (const i of items) byTrade.set(i.tradeId, (byTrade.get(i.tradeId) ?? 0) + i.price);
  const total = sum([...byTrade.values()]);
  if (total === 0) return 0;
  let weighted = 0;
  for (const [trade, price] of byTrade) weighted += (targetFor(trade, targets, asOf) ?? 0) * price;
  return weighted / total;
}

export type MarginDriver = "on_target" | "priced_low" | "discount" | "cost_overrun";

export interface MarginView {
  role: Role;
  revenue: Cents; // excludes sales tax (pass-through), includes approved adjustments
  forecastCost: Record<Category, Cents>;
  actualCost: Record<Category, Cents> | null; // null until any actual cost is logged
  forecastMargin: Cents;
  forecastPercent: number;
  /** True once the job's costs are complete, so actual replaces forecast. */
  costsFinal: boolean;
  /** Actual once costs are final, otherwise forecast. This is the number compared to target. */
  currentMargin: Cents;
  currentPercent: number;
  targetPercent: number;
  variancePoints: number; // currentPercent − target
  /** Accounting only. PM view never receives these. */
  commission?: Cents;
  netMargin?: Cents;
  netPercent?: number;
  driver: MarginDriver;
}

export interface MarginInput {
  items: LineItem[];
  totals: Totals;
  actualCosts: ActualCost[];
  targets: MarginTarget[];
  commissionRate: number;
  asOf: string;
  /** Work is done and all costs are in. Before that, logged costs are only partial. */
  costsFinal: boolean;
}

export function computeMargin(input: MarginInput, role: Role): MarginView {
  const { items, totals, actualCosts, targets, commissionRate, asOf, costsFinal } = input;
  const revenue = totals.subtotal + totals.adjustments - totals.discount;

  // Adjustments are assumed to carry cost at the same ratio as the original estimate.
  const costRatio = totals.subtotal === 0 ? 0 : totals.cost / totals.subtotal;
  const forecastCost = {} as Record<Category, Cents>;
  for (const c of CATEGORIES) {
    const base = totals.byCategory[c].cost;
    const share = totals.cost === 0 ? 0 : base / totals.cost;
    forecastCost[c] = base + Math.round(totals.adjustments * costRatio * share);
  }
  const forecastTotal = sum(CATEGORIES.map((c) => forecastCost[c]));

  let actualCost: Record<Category, Cents> | null = null;
  if (actualCosts.length > 0) {
    actualCost = { material: 0, labor: 0, other: 0 };
    for (const a of actualCosts) actualCost[a.category] += a.amount;
  }
  const actualTotal = actualCost ? sum(CATEGORIES.map((c) => actualCost![c])) : null;

  const forecastMargin = revenue - forecastTotal;
  const currentMargin = costsFinal && actualTotal !== null ? revenue - actualTotal : forecastMargin;
  const forecastPercent = percentOf(forecastMargin, revenue);
  const currentPercent = percentOf(currentMargin, revenue);
  const targetPercent = blendedTarget(items, targets, asOf);

  const view: MarginView = {
    role,
    revenue,
    forecastCost,
    actualCost,
    costsFinal,
    forecastMargin,
    forecastPercent,
    currentMargin,
    currentPercent,
    targetPercent,
    variancePoints: currentPercent - targetPercent,
    driver: "on_target",
  };

  if (role === "accounting") {
    view.commission = applyRate(revenue, commissionRate);
    view.netMargin = currentMargin - view.commission;
    view.netPercent = percentOf(view.netMargin, revenue);
  }

  view.driver = marginDriver(view, actualTotal, forecastTotal, totals.discount);
  return view;
}

function marginDriver(
  v: MarginView,
  actualTotal: Cents | null,
  forecastTotal: Cents,
  discount: Cents,
): MarginDriver {
  if (actualTotal !== null && actualTotal > forecastTotal * (1 + OVERRUN_TOLERANCE)) return "cost_overrun";
  if (v.forecastPercent >= v.targetPercent) return "on_target";
  const undiscounted = percentOf(v.revenue + discount - forecastTotal, v.revenue + discount);
  return discount > 0 && undiscounted >= v.targetPercent ? "discount" : "priced_low";
}

export const DRIVER_COPY: Record<MarginDriver, string> = {
  on_target: "On or above target.",
  priced_low: "The estimate is priced below target. Review the rates for this trade.",
  discount: "The estimate was priced to target, but the discount pulls it under.",
  cost_overrun: "Actual costs are running over the forecast.",
};
