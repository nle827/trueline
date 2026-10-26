import { makeLine, nonZero } from "./lineItem";
import type { FloorRoom, LineItem, Markups } from "./types";

/** Invented rate card for the demo company. */
export const FLOOR_RATES = {
  markups: { material: 0.3, labor: 0.55, other: 0.2 } satisfies Markups,
  waste: { straight: 0.08, diagonal: 0.14, herringbone: 0.2 },
  materialPerSqFt: { lvp: 2.6, laminate: 1.9, hardwood: 6.4, carpet: 2.2 },
  underlayPerSqFt: { lvp: 0.45, laminate: 0.45, hardwood: 0.45, carpet: 0.6 },
  installPerSqFt: { lvp: 1.8, laminate: 1.6, hardwood: 3.9, carpet: 1.1 },
  removalPerSqFt: 0.9,
  transitionStrip: 18, // one per room
  disposalPerSqFt: 0.25,
  delivery: 85,
} as const;

const MATERIAL_LABEL: Record<FloorRoom["material"], string> = {
  lvp: "Luxury vinyl plank",
  laminate: "Laminate",
  hardwood: "Engineered hardwood",
  carpet: "Carpet",
};

export function floorLineItems(rooms: FloorRoom[]): LineItem[] {
  if (rooms.length === 0) return [];
  const r = FLOOR_RATES;
  const line = makeLine.bind(null, "floor", r.markups);
  const items: LineItem[] = [];

  // Group by material so each product shows as one line.
  const byMaterial = new Map<FloorRoom["material"], { area: number; order: number }>();
  let removed = 0;
  for (const room of rooms) {
    const area = room.length * room.width;
    const order = Math.ceil(area * (1 + r.waste[room.pattern]));
    const prev = byMaterial.get(room.material) ?? { area: 0, order: 0 };
    byMaterial.set(room.material, { area: prev.area + area, order: prev.order + order });
    if (room.removeExisting) removed += area;
  }

  for (const [mat, { area, order }] of byMaterial) {
    const name = MATERIAL_LABEL[mat];
    items.push(line("material", mat, `${name} (incl. waste)`, order, "sq ft", r.materialPerSqFt[mat]));
    items.push(line("material", `${mat}-underlay`, mat === "carpet" ? "Carpet pad" : `Underlayment for ${name.toLowerCase()}`, area, "sq ft", r.underlayPerSqFt[mat]));
    items.push(line("labor", `${mat}-install`, `Install ${name.toLowerCase()}`, area, "sq ft", r.installPerSqFt[mat]));
  }

  items.push(line("material", "transitions", "Transition strips", rooms.length, "ea", r.transitionStrip));
  items.push(line("labor", "removal", "Remove existing flooring", removed, "sq ft", r.removalPerSqFt));
  items.push(line("other", "disposal", "Haul-away and disposal", removed, "sq ft", r.disposalPerSqFt));
  items.push(line("other", "delivery", "Material delivery", 1, "job", r.delivery));
  return nonZero(items);
}
