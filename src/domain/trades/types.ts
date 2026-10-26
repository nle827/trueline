import type { Cents } from "../money";

export type TradeId = "paint" | "floor" | "tile";
export type Category = "material" | "labor" | "other";
export const CATEGORIES: readonly Category[] = ["material", "labor", "other"];

/** Markup is applied on top of cost per category. Cost and price are never mixed. */
export type Markups = Record<Category, number>;

export interface LineItem {
  id: string;
  tradeId: TradeId;
  category: Category;
  label: string;
  qty: number;
  unit: string;
  cost: Cents;
  price: Cents;
}

export interface PaintRoom {
  id: string;
  name: string;
  length: number; // ft
  width: number; // ft
  height: number; // ft
  coats: 1 | 2 | 3;
  ceiling: boolean;
  doors: number;
  windows: number;
  prep: "light" | "standard" | "heavy";
}

export interface FloorRoom {
  id: string;
  name: string;
  length: number;
  width: number;
  material: "lvp" | "laminate" | "hardwood" | "carpet";
  pattern: "straight" | "diagonal" | "herringbone";
  removeExisting: boolean;
}

export interface TileArea {
  id: string;
  name: string;
  run: number; // ft of wall
  height: number; // ft
  tile: "subway" | "zellige" | "mosaic";
  removeExisting: boolean;
}

export type TradeScope =
  | { tradeId: "paint"; rooms: PaintRoom[] }
  | { tradeId: "floor"; rooms: FloorRoom[] }
  | { tradeId: "tile"; rooms: TileArea[] };

export type RoomOf<T extends TradeId> = Extract<TradeScope, { tradeId: T }>["rooms"][number];
