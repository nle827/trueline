import { DRIVER_COPY, type MarginDriver } from "@/domain/margin";
import type { Category } from "@/domain/trades";

export const CAT_COLOR: Record<Category, string> = {
  material: "var(--color-cat-material)",
  labor: "var(--color-cat-labor)",
  other: "var(--color-cat-other)",
};
export const CAT_LABEL: Record<Category, string> = { material: "Materials", labor: "Labor", other: "Other" };

export const pct = (n: number) => `${n.toFixed(1)}%`;
export const points = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)} pts`;

/** Status is shown with a word and a symbol, never color alone. */
export function DriverChip({ driver }: { driver: MarginDriver }) {
  const good = driver === "on_target";
  return (
    <p className={`flex items-start gap-2 rounded-sm px-3 py-2 text-sm ${good ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>
      <span aria-hidden="true" className="font-bold">{good ? "✓" : "!"}</span>
      <span>
        <span className="font-semibold">{good ? "On target. " : "Below target. "}</span>
        {!good && DRIVER_COPY[driver]}
      </span>
    </p>
  );
}
