import type { CompanySettings, MarginTarget } from "../types";

/** The fictional company the demo runs as. All details are invented. */
export const COMPANY = {
  name: "Plumbline Renovation Co.",
  short: "Plumbline",
  address: "418 Alder Works Way, Portland, OR 97214",
  phone: "(503) 555-0142",
  email: "office@plumbline.example",
  license: "CCB #000000 (demo)",
};

export const SETTINGS: CompanySettings = {
  taxRate: 0.0875,
  commissionRate: 0.06,
  paymentTermsDays: 15,
};

export const MARGIN_TARGETS: MarginTarget[] = [
  { tradeId: "paint", percent: 31, effectiveFrom: "2025-01-01", note: "Original target" },
  { tradeId: "paint", percent: 33, effectiveFrom: "2026-04-01", note: "Raised after crew rate change" },
  { tradeId: "floor", percent: 28, effectiveFrom: "2025-01-01", note: "Original target" },
  { tradeId: "tile", percent: 30, effectiveFrom: "2025-01-01", note: "Original target" },
];

export const PEOPLE = {
  pms: ["Dana Whitlock", "Marcus Reyes"],
  reps: ["Priya Natarajan", "Owen Castellano"],
};
