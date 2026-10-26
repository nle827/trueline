import { describe, expect, it } from "vitest";
import { floorLineItems } from "./flooring";
import { paintAreas, paintLineItems, PAINT_RATES } from "./painting";
import { tileLineItems } from "./tile";
import type { FloorRoom, PaintRoom } from "./types";

const room = (over: Partial<PaintRoom> = {}): PaintRoom => ({
  id: "r1",
  name: "Bedroom",
  length: 12,
  width: 10,
  height: 8,
  coats: 2,
  ceiling: false,
  doors: 1,
  windows: 1,
  prep: "standard",
  ...over,
});

describe("painting", () => {
  it("deducts doors and windows from wall area", () => {
    // 2 * (12 + 10) * 8 = 352, minus 20 + 15
    expect(paintAreas(room()).walls).toBe(317);
  });

  it("adds the ceiling only when selected and multiplies by coats", () => {
    const a = paintAreas(room({ ceiling: true, coats: 1 }));
    expect(a.ceiling).toBe(120);
    expect(a.coated).toBe(317 + 120);
  });

  it("never returns negative wall area", () => {
    expect(paintAreas(room({ length: 2, width: 2, height: 2, doors: 5 })).walls).toBe(0);
  });

  it("rounds paint up to whole gallons across all rooms", () => {
    const items = paintLineItems([room(), room({ id: "r2" })]);
    const paint = items.find((i) => i.label === "Paint")!;
    expect(paint.qty).toBe(Math.ceil((317 * 2 * 2) / PAINT_RATES.coverage));
  });

  it("marks up every line from its cost by category", () => {
    for (const item of paintLineItems([room()])) {
      expect(item.price).toBe(item.cost + Math.round(item.cost * PAINT_RATES.markups[item.category]));
    }
  });

  it("returns nothing for an empty scope", () => {
    expect(paintLineItems([])).toEqual([]);
  });
});

describe("flooring", () => {
  const floor = (over: Partial<FloorRoom> = {}): FloorRoom => ({
    id: "f1",
    name: "Living",
    length: 10,
    width: 10,
    material: "lvp",
    pattern: "straight",
    removeExisting: false,
    ...over,
  });

  it("orders extra material for waste based on pattern", () => {
    const straight = floorLineItems([floor()]).find((i) => i.id === "floor:lvp")!;
    const herring = floorLineItems([floor({ pattern: "herringbone" })]).find((i) => i.id === "floor:lvp")!;
    expect(straight.qty).toBe(108);
    expect(herring.qty).toBe(120);
  });

  it("groups rooms of the same material into one product line", () => {
    const items = floorLineItems([floor(), floor({ id: "f2" })]);
    expect(items.filter((i) => i.id === "floor:lvp")).toHaveLength(1);
  });

  it("charges removal and disposal only when existing floor comes out", () => {
    expect(floorLineItems([floor()]).some((i) => i.id === "floor:removal")).toBe(false);
    const items = floorLineItems([floor({ removeExisting: true })]);
    expect(items.find((i) => i.id === "floor:removal")?.qty).toBe(100);
    expect(items.find((i) => i.id === "floor:disposal")?.category).toBe("other");
  });
});

describe("tile", () => {
  it("prices a backsplash by wall area", () => {
    const items = tileLineItems([{ id: "t1", name: "Range wall", run: 10, height: 1.5, tile: "subway", removeExisting: false }]);
    expect(items.find((i) => i.id === "tile:subway-install")?.qty).toBe(15);
    expect(items.find((i) => i.id === "tile:subway")?.qty).toBe(Math.ceil(15 * 1.12));
  });
});
