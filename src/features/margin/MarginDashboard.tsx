"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { isSold } from "@/domain/document";
import { formatUSD, formatUSDWhole, percentOf, sum } from "@/domain/money";
import { MARGIN_TARGETS } from "@/domain/seed/company";
import { CATEGORIES, TRADES } from "@/domain/trades";
import { jobView, marginFor } from "@/state/selectors";
import { useApp } from "@/state/store";
import { CAT_COLOR, CAT_LABEL, pct, points } from "./shared";

export function MarginDashboard() {
  const state = useApp();
  const role = state.role;
  const rows = useMemo(
    () =>
      state.jobs
        .map((j) => jobView(state, j.id)!)
        .filter((v) => isSold(v.doc))
        .map((v) => ({ view: v, m: marginFor(v, role) }))
        .sort((a, b) => a.m.variancePoints - b.m.variancePoints),
    [state, role],
  );

  const revenue = sum(rows.map((r) => r.m.revenue));
  const margin = sum(rows.map((r) => r.m.currentMargin));
  const target = revenue ? sum(rows.map((r) => r.m.targetPercent * r.m.revenue)) / revenue : 0;
  const below = rows.filter((r) => r.m.driver !== "on_target").length;
  const commission = sum(rows.map((r) => r.m.commission ?? 0));

  // Like-for-like: only jobs that have actual costs logged.
  const withActuals = rows.filter((r) => r.m.actualCost && r.m.costsFinal);
  const costData = [
    { name: "Forecast", ...Object.fromEntries(CATEGORIES.map((c) => [c, sum(withActuals.map((r) => r.m.forecastCost[c])) / 100])) },
    { name: "Actual", ...Object.fromEntries(CATEGORIES.map((c) => [c, sum(withActuals.map((r) => r.m.actualCost![c])) / 100])) },
  ];

  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Sold revenue" value={formatUSDWhole(revenue)} note={`${rows.length} jobs, tax excluded`} />
        <Tile label="Blended margin" value={pct(percentOf(margin, revenue))} note={`Target ${pct(target)} · ${points(percentOf(margin, revenue) - target)}`} />
        <Tile label="Below target" value={String(below)} note={below === 1 ? "job needs a look" : "jobs need a look"} />
        {role === "accounting" ? (
          <Tile label="Net after commission" value={formatUSDWhole(margin - commission)} note={`${formatUSDWhole(commission)} commission`} />
        ) : (
          <Tile label="Commission" value="Hidden" note="Switch to Accounting to see it" muted />
        )}
      </dl>

      <section className="grid gap-3 rounded-sm border border-rule bg-panel p-4" aria-labelledby="by-job">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="by-job" className="font-expanded text-lg font-extrabold uppercase">Margin by job</h2>
          <p className="flex gap-4 text-xs text-soft">
            <span><Dot hollow /> Forecast</span>
            <span><Dot /> Current (actual once costs are final)</span>
            <span><i className="mr-1 inline-block h-3 w-0.5 bg-stamp align-middle" /> Target</span>
          </p>
        </div>
        <DotPlot rows={rows} role={role} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3 rounded-sm border border-rule bg-panel p-4" aria-labelledby="by-cat">
          <h2 id="by-cat" className="font-expanded text-lg font-extrabold uppercase">Cost by category</h2>
          <p className="text-xs text-soft">Forecast vs. actual across the {withActuals.length} jobs whose costs are final.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={18}>
                <CartesianGrid horizontal={false} stroke="var(--color-rule)" />
                <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} stroke="var(--color-soft)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--color-soft)" fontSize={12} width={64} />
                <Tooltip formatter={(v, k) => [formatUSD(Math.round(Number(v) * 100)), CAT_LABEL[String(k) as keyof typeof CAT_LABEL]]} cursor={{ fill: "rgb(0 0 0 / 0.04)" }} />
                <Legend formatter={(k: string) => <span className="text-xs text-graphite">{CAT_LABEL[k as keyof typeof CAT_LABEL]}</span>} />
                {CATEGORIES.map((c, i) => (
                  <Bar key={c} dataKey={c} stackId="cost" fill={CAT_COLOR[c]} stroke="var(--color-panel)" strokeWidth={2} radius={i === CATEGORIES.length - 1 ? [0, 4, 4, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <TargetsTable />
      </div>
    </div>
  );
}

function DotPlot({ rows, role }: { rows: { view: ReturnType<typeof jobView> & object; m: ReturnType<typeof marginFor> }[]; role: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const values = rows.flatMap((r) => [r.m.forecastPercent, r.m.currentPercent, r.m.targetPercent]);
  const lo = Math.floor(Math.min(15, ...values) / 5) * 5;
  const hi = Math.ceil(Math.max(45, ...values) / 5) * 5;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="relative ml-[12rem] mr-16 h-5 font-type text-[11px] text-soft">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: x(t) }}>{t}%</span>
          ))}
        </div>
        <ul>
          {rows.map(({ view, m }) => {
            const id = view.job.id;
            const active = hover === id;
            return (
              <li
                key={id}
                className={`grid grid-cols-[12rem_1fr_4rem] items-center border-t border-rule py-2 text-sm ${active ? "bg-black/[0.03]" : ""}`}
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
              >
                <Link href={`/jobs/${id}`} className="truncate pr-3 hover:underline">
                  <span className="font-type text-xs text-soft">{view.job.number}</span> {view.customer.name.split(" ")[1]}
                </Link>
                <div
                  className="relative h-6"
                  tabIndex={0}
                  aria-label={`${view.job.number}: forecast ${pct(m.forecastPercent)}, current ${pct(m.currentPercent)}, target ${pct(m.targetPercent)}`}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                >
                  {ticks.map((t) => (
                    <span key={t} className="absolute inset-y-0 w-px bg-rule/60" style={{ left: x(t) }} />
                  ))}
                  <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-carbon/30" style={{ left: x(Math.min(m.forecastPercent, m.currentPercent)), width: `calc(${x(Math.max(m.forecastPercent, m.currentPercent))} - ${x(Math.min(m.forecastPercent, m.currentPercent))})` }} />
                  <span className="absolute inset-y-0.5 w-0.5 bg-stamp" style={{ left: x(m.targetPercent) }} />
                  <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-carbon bg-panel" style={{ left: x(m.forecastPercent) }} />
                  <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-carbon ring-2 ring-panel" style={{ left: x(m.currentPercent) }} />
                  {active && (
                    <span className="absolute -top-14 z-10 w-max -translate-x-1/2 rounded-sm bg-graphite px-2 py-1 font-type text-xs text-white shadow" style={{ left: x(m.currentPercent) }}>
                      {view.job.title} · current {pct(m.currentPercent)} · forecast {pct(m.forecastPercent)}
                      <br />
                      target {pct(m.targetPercent)}{role === "accounting" && m.netPercent !== undefined ? ` · net ${pct(m.netPercent)}` : ""}
                    </span>
                  )}
                </div>
                <span className={`text-right font-type text-xs tabular ${m.variancePoints < 0 ? "text-stamp" : "text-ok"}`}>
                  {points(m.variancePoints)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TargetsTable() {
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return (
    <section className="grid content-start gap-3 rounded-sm border border-rule bg-panel p-4" aria-labelledby="targets">
      <h2 id="targets" className="font-expanded text-lg font-extrabold uppercase">Trade targets</h2>
      <p className="text-xs text-soft">Targets are set before commission. Each job is measured against the target in effect when it was signed.</p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-soft">
          <tr><th className="py-1 font-semibold">Trade</th><th className="font-semibold">Target</th><th className="font-semibold">Since</th><th className="font-semibold">Note</th></tr>
        </thead>
        <tbody>
          {[...MARGIN_TARGETS].sort((a, b) => a.tradeId.localeCompare(b.tradeId) || b.effectiveFrom.localeCompare(a.effectiveFrom)).map((t) => (
            <tr key={`${t.tradeId}-${t.effectiveFrom}`} className="border-t border-rule">
              <td className="py-1.5">{TRADES[t.tradeId].name}</td>
              <td className="font-type tabular">{t.percent}%</td>
              <td className="font-type text-xs">{fmt(t.effectiveFrom)}</td>
              <td className="text-xs text-soft">{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Tile({ label, value, note, muted }: { label: string; value: string; note: string; muted?: boolean }) {
  return (
    <div className="grid gap-1 rounded-sm border border-rule bg-panel p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-soft">{label}</dt>
      <dd className={`font-expanded text-2xl font-black tabular ${muted ? "text-soft" : ""}`}>{value}</dd>
      <dd className="font-type text-xs text-soft">{note}</dd>
    </div>
  );
}

function Dot({ hollow }: { hollow?: boolean }) {
  return <i className={`mr-1 inline-block size-2.5 rounded-full align-middle ${hollow ? "border-2 border-carbon" : "bg-carbon"}`} />;
}
