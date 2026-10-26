import { describe, expect, it } from "vitest";
import { computeTotals } from "./estimate";
import { blendedTarget, computeMargin, targetFor, type MarginInput } from "./margin";
import { changeOrder } from "./testFixtures";
import type { LineItem } from "./trades/types";
import type { MarginTarget } from "./types";

const targets: MarginTarget[] = [
  { tradeId: "paint", percent: 30, effectiveFrom: "2025-01-01", note: "" },
  { tradeId: "paint", percent: 35, effectiveFrom: "2026-06-01", note: "" },
  { tradeId: "floor", percent: 25, effectiveFrom: "2025-01-01", note: "" },
];

const items: LineItem[] = [
  { id: "m", tradeId: "paint", category: "material", label: "", qty: 1, unit: "", cost: 20000, price: 26000 },
  { id: "l", tradeId: "paint", category: "labor", label: "", qty: 1, unit: "", cost: 40000, price: 74000 },
];

const input = (over: Partial<MarginInput> = {}): MarginInput => ({
  items,
  totals: computeTotals(items, { discount: 0 }, [], 0.1),
  actualCosts: [],
  targets,
  commissionRate: 0.05,
  asOf: "2026-10-01",
  costsFinal: true,
  ...over,
});

describe("targets", () => {
  it("uses the latest target in effect on the date", () => {
    expect(targetFor("paint", targets, "2026-05-31")).toBe(30);
    expect(targetFor("paint", targets, "2026-06-01")).toBe(35);
    expect(targetFor("tile", targets, "2026-06-01")).toBeUndefined();
  });

  it("weights targets by each trade's share of the price", () => {
    const mixed: LineItem[] = [
      { ...items[0], price: 30000 },
      { ...items[0], id: "f", tradeId: "floor", price: 10000 },
    ];
    expect(blendedTarget(mixed, targets, "2026-10-01")).toBeCloseTo(32.5);
  });
});

describe("job margin", () => {
  it("excludes tax from revenue and uses forecast cost until actuals arrive", () => {
    const m = computeMargin(input(), "pm");
    expect(m.revenue).toBe(100000);
    expect(m.forecastMargin).toBe(40000);
    expect(m.currentPercent).toBeCloseTo(40);
    expect(m.actualCost).toBeNull();
    expect(m.driver).toBe("on_target");
  });

  it("switches to actual cost and flags an overrun", () => {
    const m = computeMargin(
      input({ actualCosts: [{ id: "a", jobId: "j", category: "labor", amount: 70000, vendor: "", date: "" }] }),
      "pm",
    );
    expect(m.currentMargin).toBe(30000);
    expect(m.actualCost?.labor).toBe(70000);
    expect(m.driver).toBe("cost_overrun");
  });

  it("keeps the forecast while costs are partial, but still flags spend past forecast", () => {
    const partial = computeMargin(
      input({ costsFinal: false, actualCosts: [{ id: "a", jobId: "j", category: "labor", amount: 20000, vendor: "", date: "" }] }),
      "pm",
    );
    expect(partial.currentMargin).toBe(partial.forecastMargin);
    expect(partial.driver).toBe("on_target");
    const over = computeMargin(
      input({ costsFinal: false, actualCosts: [{ id: "a", jobId: "j", category: "labor", amount: 70000, vendor: "", date: "" }] }),
      "pm",
    );
    expect(over.driver).toBe("cost_overrun");
  });

  it("adds approved adjustments to revenue with proportional cost", () => {
    const totals = computeTotals(items, { discount: 0 }, [changeOrder({ status: "approved", amount: 10000 })], 0);
    const m = computeMargin(input({ totals }), "pm");
    expect(m.revenue).toBe(110000);
    expect(m.forecastCost.material + m.forecastCost.labor).toBe(66000);
  });

  it("blames the discount when undiscounted pricing met target", () => {
    const totals = computeTotals(items, { discount: 12000 }, [], 0);
    expect(computeMargin(input({ totals }), "pm").driver).toBe("discount");
  });

  it("hides commission from the PM view entirely", () => {
    const pm = computeMargin(input(), "pm");
    expect(pm.commission).toBeUndefined();
    expect(pm.netMargin).toBeUndefined();
    const acct = computeMargin(input(), "accounting");
    expect(acct.commission).toBe(5000);
    expect(acct.netMargin).toBe(35000);
  });
});
