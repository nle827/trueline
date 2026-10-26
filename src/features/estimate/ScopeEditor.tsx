"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TRADES, type TradeId, type TradeScope } from "@/domain/trades";
import { Button } from "@/ui/Button";
import { report } from "@/ui/toast";
import { useApp } from "@/state/store";
import type { JobView } from "@/state/selectors";

type Field =
  | { key: string; label: string; type: "text" }
  | { key: string; label: string; type: "number"; min: number; max: number; step?: number; suffix?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; numeric?: boolean }
  | { key: string; label: string; type: "check" };

const FIELDS: Record<TradeId, Field[]> = {
  paint: [
    { key: "name", label: "Room", type: "text" },
    { key: "length", label: "Length", type: "number", min: 1, max: 60, suffix: "ft" },
    { key: "width", label: "Width", type: "number", min: 1, max: 60, suffix: "ft" },
    { key: "height", label: "Height", type: "number", min: 6, max: 20, suffix: "ft" },
    { key: "coats", label: "Coats", type: "select", numeric: true, options: [1, 2, 3].map((n) => ({ value: String(n), label: String(n) })) },
    { key: "prep", label: "Prep", type: "select", options: [{ value: "light", label: "Light" }, { value: "standard", label: "Standard" }, { value: "heavy", label: "Heavy" }] },
    { key: "doors", label: "Doors", type: "number", min: 0, max: 10 },
    { key: "windows", label: "Windows", type: "number", min: 0, max: 12 },
    { key: "ceiling", label: "Ceiling", type: "check" },
  ],
  floor: [
    { key: "name", label: "Room", type: "text" },
    { key: "length", label: "Length", type: "number", min: 1, max: 80, suffix: "ft" },
    { key: "width", label: "Width", type: "number", min: 1, max: 80, suffix: "ft" },
    { key: "material", label: "Material", type: "select", options: [{ value: "lvp", label: "LVP" }, { value: "laminate", label: "Laminate" }, { value: "hardwood", label: "Hardwood" }, { value: "carpet", label: "Carpet" }] },
    { key: "pattern", label: "Layout", type: "select", options: [{ value: "straight", label: "Straight" }, { value: "diagonal", label: "Diagonal" }, { value: "herringbone", label: "Herringbone" }] },
    { key: "removeExisting", label: "Remove old", type: "check" },
  ],
  tile: [
    { key: "name", label: "Wall", type: "text" },
    { key: "run", label: "Run", type: "number", min: 1, max: 40, suffix: "ft" },
    { key: "height", label: "Height", type: "number", min: 0.5, max: 8, step: 0.5, suffix: "ft" },
    { key: "tile", label: "Tile", type: "select", options: [{ value: "subway", label: "Subway" }, { value: "zellige", label: "Zellige" }, { value: "mosaic", label: "Mosaic" }] },
    { key: "removeExisting", label: "Remove old", type: "check" },
  ],
};

const newRoom = (tradeId: TradeId, n: number): Record<string, unknown> => {
  const id = `${tradeId}-${Date.now().toString(36)}`;
  switch (tradeId) {
    case "paint":
      return { id, name: `Room ${n}`, length: 12, width: 10, height: 8, coats: 2, ceiling: false, doors: 1, windows: 1, prep: "standard" };
    case "floor":
      return { id, name: `Room ${n}`, length: 12, width: 12, material: "lvp", pattern: "straight", removeExisting: true };
    case "tile":
      return { id, name: `Wall ${n}`, run: 8, height: 1.5, tile: "subway", removeExisting: false };
  }
};

export function ScopeEditor({ view }: { view: JobView }) {
  const updateScopes = useApp((s) => s.updateScopes);
  const locked = view.doc.kind === "invoice" || view.doc.status === "signed";
  const scopes = view.job.scopes;
  const missing = (Object.keys(TRADES) as TradeId[]).filter((t) => !scopes.some((s) => s.tradeId === t));

  const save = (next: TradeScope[]) => report(updateScopes(view.job.id, next));

  const setRooms = (tradeId: TradeId, rooms: Record<string, unknown>[]) =>
    save(scopes.map((s) => (s.tradeId === tradeId ? ({ ...s, rooms } as unknown as TradeScope) : s)));

  return (
    <section className="grid gap-4" aria-labelledby="scope-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="scope-title" className="font-expanded text-lg font-extrabold uppercase">Scope</h2>
        {locked && <span className="font-type text-xs text-soft">Locked after signing</span>}
      </div>
      {locked && (
        <p className="rounded-sm bg-black/5 p-3 text-sm text-soft">
          The client signed this scope. Changes now go through adjustments on the document.
        </p>
      )}
      {view.doc.status === "sent" && (
        <p className="rounded-sm bg-copy-canary/60 p-3 text-sm">Editing a sent estimate puts it back in draft. You&apos;ll need to send it again.</p>
      )}

      <AnimatePresence initial={false}>
        {scopes.map((scope) => {
          const rooms = scope.rooms as unknown as Record<string, unknown>[];
          const trade = TRADES[scope.tradeId];
          return (
            <motion.div
              key={scope.tradeId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="grid gap-3 rounded-sm border border-rule bg-panel p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {trade.name} <span className="font-type text-xs text-soft">{trade.code}</span>
                </h3>
                {!locked && scopes.length > 1 && (
                  <Button variant="ghost" className="text-xs" onClick={() => save(scopes.filter((s) => s.tradeId !== scope.tradeId))}>
                    Remove trade
                  </Button>
                )}
              </div>

              {rooms.length === 0 && <p className="text-sm text-soft">No {trade.unitNoun}s yet. Add one to start pricing.</p>}

              <AnimatePresence initial={false}>
                {rooms.map((room, i) => (
                  <motion.fieldset
                    key={String(room.id)}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    disabled={locked}
                    className="grid grid-cols-2 gap-2 border-t border-rule pt-3 sm:grid-cols-4"
                  >
                    <legend className="sr-only">{String(room.name)}</legend>
                    {FIELDS[scope.tradeId].map((f) => (
                      <FieldInput
                        key={f.key}
                        id={`${room.id}-${f.key}`}
                        field={f}
                        value={room[f.key]}
                        onChange={(v) => setRooms(scope.tradeId, rooms.map((r, j) => (j === i ? { ...r, [f.key]: v } : r)))}
                      />
                    ))}
                    {!locked && (
                      <div className="col-span-full flex justify-end">
                        <Button variant="ghost" className="text-xs text-stamp" onClick={() => setRooms(scope.tradeId, rooms.filter((_, j) => j !== i))}>
                          Remove {trade.unitNoun}
                        </Button>
                      </div>
                    )}
                  </motion.fieldset>
                ))}
              </AnimatePresence>

              {!locked && (
                <Button className="justify-self-start" onClick={() => setRooms(scope.tradeId, [...rooms, newRoom(scope.tradeId, rooms.length + 1)])}>
                  + Add {trade.unitNoun}
                </Button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {!locked && missing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missing.map((t) => (
            <Button
              key={t}
              variant="ghost"
              className="border border-dashed border-rule"
              onClick={() => save([...scopes, { tradeId: t, rooms: [newRoom(t, 1)] } as unknown as TradeScope])}
            >
              + {TRADES[t].name}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

function FieldInput({ id, field, value, onChange }: { id: string; field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const base = "w-full rounded-sm border border-rule bg-copy-white px-2 py-1.5 font-type text-sm disabled:bg-black/[0.03] disabled:text-soft";
  if (field.type === "check") {
    return (
      <label htmlFor={id} className="flex items-center gap-2 self-end pb-2 text-xs font-semibold">
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-carbon" />
        {field.label}
      </label>
    );
  }
  return (
    <label htmlFor={id} className={`grid gap-1 text-xs font-semibold ${field.type === "text" ? "col-span-2" : ""}`}>
      <span>
        {field.label}
        {field.type === "number" && field.suffix && <span className="font-normal text-soft"> ({field.suffix})</span>}
      </span>
      {field.type === "select" ? (
        <select id={id} value={String(value)} onChange={(e) => onChange(field.numeric ? Number(e.target.value) : e.target.value)} className={base}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={Number(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(field.max, Math.max(field.min, n)));
          }}
          className={`${base} tabular`}
        />
      ) : (
        <input id={id} type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className={base} />
      )}
    </label>
  );
}
