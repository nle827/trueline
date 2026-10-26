import type { DisplayType } from "@/domain/document";

/** Each document state is printed on its own carbon-copy sheet. */
export const PAPER: Record<DisplayType, { bg: string; name: string }> = {
  Estimate: { bg: "var(--color-copy-white)", name: "White copy" },
  Invoice: { bg: "var(--color-copy-canary)", name: "Canary copy" },
  Receipt: { bg: "var(--color-copy-pink)", name: "Pink copy" },
};
