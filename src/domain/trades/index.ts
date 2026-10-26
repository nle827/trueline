import { floorLineItems } from "./flooring";
import { paintLineItems } from "./painting";
import { tileLineItems } from "./tile";
import type { LineItem, TradeId, TradeScope } from "./types";

export * from "./types";

export interface TradeInfo {
  id: TradeId;
  name: string;
  code: string;
  unitNoun: string; // "room" / "area"
}

export const TRADES: Record<TradeId, TradeInfo> = {
  paint: { id: "paint", name: "Interior Painting", code: "PT", unitNoun: "room" },
  floor: { id: "floor", name: "Flooring", code: "FL", unitNoun: "room" },
  tile: { id: "tile", name: "Tile Backsplash", code: "TB", unitNoun: "wall" },
};

export function scopeLineItems(scope: TradeScope): LineItem[] {
  switch (scope.tradeId) {
    case "paint":
      return paintLineItems(scope.rooms);
    case "floor":
      return floorLineItems(scope.rooms);
    case "tile":
      return tileLineItems(scope.rooms);
  }
}

export const allLineItems = (scopes: TradeScope[]): LineItem[] => scopes.flatMap(scopeLineItems);
