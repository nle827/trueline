"use client";

import { formatUSD } from "@/domain/money";
import { CATEGORIES } from "@/domain/trades";
import { marginFor, type JobView } from "@/state/selectors";
import { useApp } from "@/state/store";
import { CAT_COLOR, CAT_LABEL, DriverChip, pct, points } from "./shared";

export function JobMargin({ view }: { view: JobView }) {
  const role = useApp((s) => s.role);
  if (view.items.length === 0) return null;
  const m = marginFor(view, role);
  const max = Math.max(1, ...CATEGORIES.flatMap((c) => [m.forecastCost[c], m.actualCost?.[c] ?? 0]));

  return (
    <section className="grid gap-4 rounded-sm border border-rule bg-panel p-4" aria-labelledby="margin-title">
      <div className="flex items-baseline justify-between">
        <h2 id="margin-title" className="font-expanded text-lg font-extrabold uppercase">Margin</h2>
        <span className="font-type text-xs text-soft">{role === "pm" ? "PM view" : "Accounting view"}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatUSD(m.revenue)} note="Excludes sales tax" />
        <Stat label="Forecast" value={pct(m.forecastPercent)} note={formatUSD(m.forecastMargin)} />
        <Stat
          label={m.costsFinal && m.actualCost ? "Actual" : "Current"}
          value={pct(m.currentPercent)}
          note={!m.actualCost ? "No costs logged yet" : m.costsFinal ? formatUSD(m.currentMargin) : "Costs still coming in"}
        />
        <Stat label="Target" value={pct(m.targetPercent)} note={points(m.variancePoints)} />
      </dl>

      <DriverChip driver={m.driver} />

      <div className="grid gap-2" role="table" aria-label="Cost by category, forecast and actual">
        {CATEGORIES.map((c) => (
          <div key={c} role="row" className="grid grid-cols-[5rem_1fr_auto] items-center gap-2 text-xs">
            <span role="rowheader" className="font-semibold">{CAT_LABEL[c]}</span>
            <span role="cell" className="grid gap-0.5">
              <Bar value={m.forecastCost[c]} max={max} color={CAT_COLOR[c]} hollow title={`Forecast ${formatUSD(m.forecastCost[c])}`} />
              {m.actualCost && <Bar value={m.actualCost[c]} max={max} color={CAT_COLOR[c]} title={`Actual ${formatUSD(m.actualCost[c])}`} />}
            </span>
            <span role="cell" className="text-right font-type tabular">
              {formatUSD(m.forecastCost[c])}
              {m.actualCost && <span className="block text-soft">{formatUSD(m.actualCost[c])}</span>}
            </span>
          </div>
        ))}
        <p className="text-xs text-soft">Outlined bar is forecast{m.actualCost ? (m.costsFinal ? ", solid is actual" : ", solid is spent so far") : ""}.</p>
      </div>

      {role === "accounting" ? (
        <dl className="grid gap-1 border-t border-rule pt-3 font-type text-sm tabular">
          <div className="flex justify-between"><dt>Commission to {view.job.rep}</dt><dd>−{formatUSD(m.commission ?? 0)}</dd></div>
          <div className="flex justify-between font-bold"><dt>Net margin</dt><dd>{formatUSD(m.netMargin ?? 0)} ({pct(m.netPercent ?? 0)})</dd></div>
        </dl>
      ) : (
        <p className="border-t border-rule pt-3 text-xs text-soft">Figures are margin before commission. Switch to Accounting to see commission and net margin.</p>
      )}
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-soft">{label}</dt>
      <dd className="font-type text-lg font-bold tabular">{value}</dd>
      <dd className="font-type text-xs text-soft">{note}</dd>
    </div>
  );
}

function Bar({ value, max, color, hollow, title }: { value: number; max: number; color: string; hollow?: boolean; title: string }) {
  return (
    <span className="block h-2.5" title={title}>
      <span
        className="block h-full rounded-r"
        style={{
          width: `${Math.max(1, (value / max) * 100)}%`,
          background: hollow ? "transparent" : color,
          border: hollow ? `1.5px solid ${color}` : undefined,
        }}
      />
    </span>
  );
}
