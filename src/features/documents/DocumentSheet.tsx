"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { formatSigned, formatUSD } from "@/domain/money";
import { COMPANY } from "@/domain/seed/company";
import { CATEGORIES, type Category } from "@/domain/trades";
import type { JobView } from "@/state/selectors";
import { PAPER } from "./paper";

const CATEGORY_LABEL: Record<Category, string> = { material: "Materials", labor: "Labor", other: "Other" };
const ORDER = ["Estimate", "Invoice", "Receipt"] as const;

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/**
 * The carbon-copy stack. The sheet on top is the current document; the copies still to come
 * peek out underneath. Converting tears the top sheet away to reveal the next one.
 */
export function DocumentSheet({ view, showCost }: { view: JobView; showCost: boolean }) {
  const current = ORDER.indexOf(view.displayType);
  const below = ORDER.slice(current + 1);

  return (
    <div className="relative" style={{ paddingBottom: below.length * 6, paddingRight: below.length * 6 }}>
      {below
        .map((t, i) => (
          <div
            key={t}
            aria-hidden="true"
            className="absolute rounded-sm shadow-sm"
            style={{
              top: 0,
              left: 0,
              right: below.length * 6,
              bottom: below.length * 6,
              transform: `translate(${(i + 1) * 6}px, ${(i + 1) * 6}px)`,
              background: PAPER[t].bg,
            }}
          />
        ))
        .reverse()}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.article
          key={view.displayType}
          aria-label={`${view.displayType} for ${view.job.number}`}
          initial={{ opacity: 0.6, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
          exit={{ x: -60, y: -260, rotate: -12, opacity: 0, transition: { duration: 0.6, ease: [0.65, 0, 0.35, 1] } }}
          className="perforated relative grid gap-5 rounded-sm p-5 pt-7 text-carbon shadow-[0_1px_0_rgb(0_0_0/0.06),0_8px_20px_rgb(42_45_49/0.12)] sm:p-7 sm:pt-9"
          style={{ background: PAPER[view.displayType].bg }}
        >
          <SheetBody view={view} showCost={showCost} />
          {view.displayType === "Receipt" && <PaidStamp />}
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

function SheetBody({ view, showCost }: { view: JobView; showCost: boolean }) {
  const { job, customer, doc, totals } = view;
  const approved = view.changeOrders.filter((c) => c.status === "approved");

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-expanded text-3xl font-black uppercase text-graphite">{view.displayType}</p>
          <p className="font-type text-xs">{PAPER[view.displayType].name} · {COMPANY.name}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-3 font-type text-xs">
          <dt className="text-soft">Job</dt>
          <dd>{job.number}</dd>
          {doc.kind === "invoice" ? (
            <>
              <dt className="text-soft">Invoice</dt>
              <dd>{doc.invoiceNumber}</dd>
              <dt className="text-soft">Issued</dt>
              <dd>{shortDate(doc.issuedAt)}</dd>
              <dt className="text-soft">Due</dt>
              <dd>{shortDate(doc.dueAt)}</dd>
            </>
          ) : (
            <>
              <dt className="text-soft">Status</dt>
              <dd className="uppercase">{doc.status}</dd>
              {doc.signedAt && (
                <>
                  <dt className="text-soft">Signed</dt>
                  <dd>{shortDate(doc.signedAt)}</dd>
                </>
              )}
            </>
          )}
        </dl>
      </header>

      <div className="grid gap-0.5 font-type text-sm">
        <span className="text-xs text-soft">Prepared for</span>
        <span className="font-bold">{customer.name}</span>
        <span>{customer.address}</span>
      </div>

      {doc.voidedInvoiceNumbers.length > 0 && (
        <p className="font-type text-xs text-stamp">Voided: {doc.voidedInvoiceNumbers.join(", ")}</p>
      )}

      {view.items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-carbon/30 p-4 text-center font-type text-sm">
          No line items yet. Add a room in the scope panel and the estimate fills in here.
        </p>
      ) : (
        <div className="grid gap-2">
          {CATEGORIES.map((c) => (
            <CategoryGroup key={c} category={c} view={view} showCost={showCost} />
          ))}
        </div>
      )}

      <dl className="grid gap-1 border-t-2 border-carbon/40 pt-3 font-type text-sm tabular">
        <Row label="Subtotal" value={formatUSD(totals.subtotal)} />
        {approved.map((c) => (
          <Row key={c.id} label={`Adjustment · ${c.description}`} value={formatSigned(c.amount)} className="text-stamp" />
        ))}
        {totals.discount > 0 && <Row label="Discount" value={`−${formatUSD(totals.discount)}`} />}
        <Row label="Sales tax (materials)" value={formatUSD(totals.tax)} />
        <Row label="Total" value={formatUSD(totals.total)} className="text-base font-bold text-graphite" />
        {doc.kind === "invoice" && (
          <>
            <Row label="Paid to date" value={`−${formatUSD(view.paid)}`} />
            <Row label="Balance due" value={formatUSD(Math.max(0, view.balance))} className="text-lg font-bold text-graphite" />
          </>
        )}
        {showCost && (
          <Row
            label="Internal: forecast cost"
            value={`${formatUSD(totals.cost)} (${totals.subtotal ? Math.round((1 - totals.cost / totals.subtotal) * 100) : 0}% gross)`}
            className="text-soft"
          />
        )}
      </dl>
    </>
  );
}

function CategoryGroup({ category, view, showCost }: { category: Category; view: JobView; showCost: boolean }) {
  const [open, setOpen] = useState(category !== "other");
  const items = view.items.filter((i) => i.category === category);
  if (items.length === 0) return null;
  const total = view.totals.byCategory[category];
  const panelId = `${view.job.id}-${category}`;
  return (
    <div className="border-b border-dashed border-carbon/30 pb-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-2 font-sans text-sm font-bold text-graphite">
          <motion.span animate={{ rotate: open ? 90 : 0 }} className="inline-block text-xs" aria-hidden="true">▶</motion.span>
          {CATEGORY_LABEL[category]}
          <span className="font-type text-xs font-normal text-soft">{items.length} lines</span>
        </span>
        <span className="font-type text-sm font-bold tabular">{formatUSD(total.price)}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {items.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 py-0.5 pl-5 font-type text-sm">
                <span className="min-w-0">
                  {i.label}
                  <span className="text-xs text-soft"> · {i.qty.toLocaleString()} {i.unit}</span>
                </span>
                <span className="shrink-0 tabular">
                  {showCost && <span className="mr-3 text-xs text-soft">cost {formatUSD(i.cost)}</span>}
                  {formatUSD(i.price)}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${className}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  );
}

function PaidStamp() {
  return (
    <motion.span
      aria-hidden="true"
      initial={{ scale: 2.4, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 0.85, rotate: -12 }}
      transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.35 }}
      className="pointer-events-none absolute right-8 top-36 rounded border-4 border-stamp px-3 font-expanded text-4xl font-black tracking-widest text-stamp mix-blend-multiply"
    >
      PAID
    </motion.span>
  );
}
