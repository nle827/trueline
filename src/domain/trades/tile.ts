import { makeLine, nonZero } from "./lineItem";
import type { LineItem, Markups, TileArea } from "./types";

/** Invented rate card for the demo company. */
export const TILE_RATES = {
  markups: { material: 0.3, labor: 0.5, other: 0.2 } satisfies Markups,
  waste: 0.12,
  tilePerSqFt: { subway: 7, zellige: 22, mosaic: 16 },
  setPerSqFt: 1.4, // thinset + grout + sealer
  installPerSqFt: { subway: 14, zellige: 18, mosaic: 20 },
  removalPerSqFt: 4,
  setupFee: 60,
} as const;

const TILE_LABEL: Record<TileArea["tile"], string> = {
  subway: "Ceramic subway tile",
  zellige: "Handmade zellige",
  mosaic: "Glass mosaic sheets",
};

export function tileLineItems(areas: TileArea[]): LineItem[] {
  if (areas.length === 0) return [];
  const r = TILE_RATES;
  const line = makeLine.bind(null, "tile", r.markups);
  const items: LineItem[] = [];

  const byTile = new Map<TileArea["tile"], number>();
  let total = 0;
  let removed = 0;
  for (const a of areas) {
    const area = a.run * a.height;
    total += area;
    byTile.set(a.tile, (byTile.get(a.tile) ?? 0) + area);
    if (a.removeExisting) removed += area;
  }

  for (const [tile, area] of byTile) {
    items.push(line("material", tile, `${TILE_LABEL[tile]} (incl. waste)`, Math.ceil(area * (1 + r.waste)), "sq ft", r.tilePerSqFt[tile]));
    items.push(line("labor", `${tile}-install`, `Set and grout ${TILE_LABEL[tile].toLowerCase()}`, area, "sq ft", r.installPerSqFt[tile]));
  }
  items.push(line("material", "setting", "Thinset, grout and sealer", total, "sq ft", r.setPerSqFt));
  items.push(line("labor", "removal", "Remove existing backsplash", removed, "sq ft", r.removalPerSqFt));
  items.push(line("other", "setup", "Setup and cleanup", 1, "job", r.setupFee));
  return nonZero(items);
}
