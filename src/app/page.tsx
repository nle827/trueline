import Link from "next/link";
import { CASE_STUDY_URL } from "@/features/shell/links";
import { COMPANY } from "@/domain/seed/company";

const SHEETS = [
  { label: "Estimate", note: "White copy. Priced room by room.", bg: "bg-copy-white" },
  { label: "Invoice", note: "Canary copy. Payments, balance, adjustments.", bg: "bg-copy-canary" },
  { label: "Receipt", note: "Pink copy. Paid in full, PDF ready.", bg: "bg-copy-pink" },
];

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="grid gap-6">
        <p className="font-type text-sm text-soft">A portfolio demo · {COMPANY.name} is fictional</p>
        <h1 className="font-expanded text-5xl font-black uppercase leading-[0.95] sm:text-6xl">Trueline</h1>
        <p className="max-w-xl text-lg">
          Job management for a home-improvement contractor. Build an estimate room by room, turn it into an invoice, take payments,
          and see whether each job is hitting its margin.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/board" className="rounded-sm bg-graphite px-5 py-3 font-semibold text-white hover:bg-black">Open the demo</Link>
          <Link href={CASE_STUDY_URL} className="rounded-sm border border-graphite px-5 py-3 font-semibold hover:bg-panel">Read the case study</Link>
        </div>
        <p className="text-sm text-soft">Runs entirely in your browser. Changes are saved locally, and you can reset the demo at any time.</p>
      </div>

      <ol className="relative mx-auto h-80 w-full max-w-sm" aria-label="The three documents a job goes through">
        {SHEETS.map((s, i) => (
          <li
            key={s.label}
            className={`perforated absolute inset-x-0 grid h-56 content-start gap-2 rounded-sm p-6 pt-8 text-carbon shadow-lg ${s.bg}`}
            style={{ top: (2 - i) * 22, left: (2 - i) * 14, right: -(2 - i) * 14, zIndex: 3 - i, transform: `rotate(${(i - 1) * -2}deg)` }}
          >
            <span className="font-expanded text-2xl font-black uppercase text-graphite">{s.label}</span>
            <span className="font-type text-sm">{s.note}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
