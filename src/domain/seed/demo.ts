import { computeTotals } from "../estimate";
import { visibilityFor, type Actor, type EventType, type JobEvent } from "../events";
import { formatSigned, formatUSD, type Cents } from "../money";
import { allLineItems } from "../trades";
import type { FloorRoom, PaintRoom, TileArea, TradeScope } from "../trades/types";
import {
  STAGES,
  type ActualCost,
  type ChangeOrder,
  type Customer,
  type Job,
  type JobDocument,
  type Payment,
  type Stage,
} from "../types";
import { PEOPLE, SETTINGS } from "./company";
import { createRandom, type Random } from "./random";

export interface DemoData {
  customers: Customer[];
  jobs: Job[];
  documents: Record<string, JobDocument>;
  changeOrders: ChangeOrder[];
  payments: Payment[];
  actualCosts: ActualCost[];
  events: JobEvent[];
  nextInvoice: number;
  nextJobNumber: number;
}

type TradeSpec = "paint" | "floor" | "tile";

interface JobSpec {
  customer: string;
  street: string;
  title: string;
  trades: TradeSpec[];
  stage: Stage;
  ageDays: number;
  estimateStatus?: "draft" | "sent";
  discount?: Cents;
  paidShare?: number; // share of total paid, for invoiced jobs
  adjustments?: { description: string; amount: Cents; status: ChangeOrder["status"] }[];
  costFactor?: number; // actual / forecast
}

const SPECS: JobSpec[] = [
  { customer: "Ingrid Lindqvist", street: "2210 SE Tibbetts St", title: "Kitchen and hall repaint", trades: ["paint"], stage: "invoiced", ageDays: 34, paidShare: 0.5, adjustments: [{ description: "Paint closet interiors", amount: 44000, status: "approved" }] },
  { customer: "Rafael Ortega", street: "5815 N Concord Ave", title: "Main floor LVP", trades: ["floor"], stage: "in_progress", ageDays: 22, adjustments: [{ description: "Stair nosing and two treads", amount: 61500, status: "proposed" }], costFactor: 0.6 },
  { customer: "Hana Kim", street: "1408 NE Knott St", title: "Kitchen backsplash", trades: ["tile"], stage: "scheduled", ageDays: 15 },
  { customer: "Walt Abernathy", street: "7720 SW Capitol Hwy", title: "Whole-house repaint", trades: ["paint"], stage: "closed", ageDays: 70, paidShare: 1, costFactor: 0.97 },
  { customer: "Emi Nakamura", street: "3315 SE Woodward St", title: "Basement floor and walls", trades: ["floor", "paint"], stage: "punch_list", ageDays: 41, costFactor: 1.14, adjustments: [{ description: "Moisture barrier under LVP", amount: 38000, status: "approved" }] },
  { customer: "Simone Delacroix", street: "916 NW Overton St", title: "Primary bath backsplash", trades: ["tile"], stage: "estimating", ageDays: 6, estimateStatus: "sent" },
  { customer: "Chidi Okafor", street: "4402 N Michigan Ave", title: "Nursery refresh", trades: ["paint"], stage: "lead", ageDays: 2, estimateStatus: "draft" },
  { customer: "Fiona Brennan", street: "2731 NE 21st Ave", title: "Hardwood living and dining", trades: ["floor"], stage: "sold", ageDays: 11, discount: 120000 },
  { customer: "Nikolai Petrov", street: "6118 SE Ash St", title: "Kitchen tile and paint", trades: ["tile", "paint"], stage: "invoiced", ageDays: 29, paidShare: 0, costFactor: 0.94 },
  { customer: "Layla Haddad", street: "1950 SE Lambert St", title: "Rental turnover", trades: ["paint", "floor"], stage: "closed", ageDays: 58, paidShare: 1, costFactor: 1.02, adjustments: [{ description: "Skip hall ceiling", amount: -18000, status: "approved" }] },
  { customer: "Kenji Sato", street: "820 N Killingsworth St", title: "Hallway carpet swap", trades: ["floor"], stage: "estimating", ageDays: 4, estimateStatus: "draft" },
];

const PAINT_ROOMS = ["Kitchen", "Hallway", "Living room", "Bedroom", "Primary bedroom", "Office", "Bathroom", "Dining room"];
const FLOOR_ROOMS = ["Living room", "Dining room", "Bedroom", "Hallway", "Den", "Basement"];
const TILE_WALLS = ["Range wall", "Sink wall", "Coffee bar", "Vanity wall"];

function paintRooms(r: Random, prefix: string): PaintRoom[] {
  return Array.from({ length: r.int(2, 4) }, (_, i) => ({
    id: `${prefix}-p${i}`,
    name: PAINT_ROOMS[(i + r.int(0, 3)) % PAINT_ROOMS.length],
    length: r.int(9, 18),
    width: r.int(8, 14),
    height: r.pick([8, 8, 9, 10]),
    coats: r.pick([2, 2, 2, 1] as const),
    ceiling: r.chance(0.5),
    doors: r.int(1, 2),
    windows: r.int(0, 3),
    prep: r.pick(["light", "standard", "standard", "heavy"] as const),
  }));
}

function floorRooms(r: Random, prefix: string): FloorRoom[] {
  const material = r.pick(["lvp", "lvp", "laminate", "hardwood", "carpet"] as const);
  return Array.from({ length: r.int(1, 3) }, (_, i) => ({
    id: `${prefix}-f${i}`,
    name: FLOOR_ROOMS[(i + r.int(0, 2)) % FLOOR_ROOMS.length],
    length: r.int(10, 22),
    width: r.int(9, 16),
    material,
    pattern: r.pick(["straight", "straight", "diagonal", "herringbone"] as const),
    removeExisting: r.chance(0.7),
  }));
}

function tileAreas(r: Random, prefix: string): TileArea[] {
  return Array.from({ length: r.int(1, 2) }, (_, i) => ({
    id: `${prefix}-t${i}`,
    name: TILE_WALLS[i],
    run: r.int(6, 14),
    height: r.pick([1.5, 1.5, 2, 4]),
    tile: r.pick(["subway", "subway", "zellige", "mosaic"] as const),
    removeExisting: r.chance(0.4),
  }));
}

const daysAgo = (now: Date, days: number, hour = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const idx = (s: Stage) => STAGES.indexOf(s);

/** Build the demo company's jobs, relative to `now` so the data always looks current. */
export function buildDemoData(now: Date = new Date()): DemoData {
  const r = createRandom(20261023);
  const data: DemoData = {
    customers: [],
    jobs: [],
    documents: {},
    changeOrders: [],
    payments: [],
    actualCosts: [],
    events: [],
    nextInvoice: 2201,
    nextJobNumber: 1031,
  };
  let eventSeq = 0;
  const log = (jobId: string, at: string, type: EventType, actor: Actor, message: string) =>
    data.events.push({ id: `e${++eventSeq}`, jobId, at, type, actor, message, visibility: visibilityFor(type) });

  SPECS.forEach((spec, n) => {
    const jobId = `j${n + 1}`;
    const custId = `c${n + 1}`;
    const [first, last] = spec.customer.split(" ");
    data.customers.push({
      id: custId,
      name: spec.customer,
      address: `${spec.street}, Portland, OR`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      phone: `(503) 555-01${String(10 + n).padStart(2, "0")}`,
    });

    const scopes: TradeScope[] = spec.trades.map((t) =>
      t === "paint"
        ? { tradeId: "paint", rooms: paintRooms(r, jobId) }
        : t === "floor"
          ? { tradeId: "floor", rooms: floorRooms(r, jobId) }
          : { tradeId: "tile", rooms: tileAreas(r, jobId) },
    );

    const at = (dayOffset: number, hour = 10) => daysAgo(now, Math.max(0, spec.ageDays - dayOffset), hour);
    const reached = (s: Stage) => idx(spec.stage) >= idx(s);
    const pm = PEOPLE.pms[n % 2];
    const rep = PEOPLE.reps[(n + 1) % 2];

    const job: Job = {
      id: jobId,
      number: `TL-${data.nextJobNumber++}`,
      customerId: custId,
      title: spec.title,
      stage: spec.stage,
      pm,
      rep,
      createdAt: at(0),
      scopes,
    };
    if (reached("scheduled")) {
      job.startDate = at(Math.min(spec.ageDays - 1, 14));
      job.endDate = at(Math.min(spec.ageDays, 20));
    }
    data.jobs.push(job);
    log(jobId, at(0, 9), "job_created", "system", `Lead created for ${spec.customer} by ${rep}.`);

    const doc: JobDocument = {
      jobId,
      kind: "estimate",
      status: spec.estimateStatus ?? (reached("sold") ? "signed" : "draft"),
      discount: spec.discount ?? 0,
      voidedInvoiceNumbers: [],
    };

    if (doc.status !== "draft") {
      doc.sentAt = at(2);
      log(jobId, doc.sentAt, "estimate_sent", "pm", "Estimate sent to the client.");
      log(jobId, at(2, 19), "estimate_viewed", "client", `${spec.customer} viewed the estimate.`);
    }
    if (doc.status === "signed") {
      doc.signedAt = at(4, 16);
      log(jobId, doc.signedAt, "estimate_signed", "client", `${spec.customer} signed the estimate.`);
      log(jobId, at(4, 17), "stage_moved", "system", "Moved to Sold.");
    }

    for (const [i, a] of (spec.adjustments ?? []).entries()) {
      const co: ChangeOrder = {
        id: `${jobId}-co${i}`,
        jobId,
        description: a.description,
        amount: a.amount,
        status: a.status,
        createdAt: at(10 + i),
        decidedAt: a.status === "proposed" ? undefined : at(11 + i),
      };
      data.changeOrders.push(co);
      log(jobId, co.createdAt, "adjustment_proposed", "pm", `Adjustment proposed: ${a.description} (${formatSigned(a.amount)}).`);
      if (co.decidedAt)
        log(jobId, co.decidedAt, `adjustment_${a.status}` as EventType, "client", `Adjustment ${a.status}: ${a.description} (${formatSigned(a.amount)}).`);
    }

    if (reached("scheduled")) log(jobId, at(6), "stage_moved", "pm", "Moved to Scheduled.");
    if (reached("in_progress")) log(jobId, at(12), "stage_moved", "pm", "Moved to In Progress.");
    if (reached("punch_list")) log(jobId, at(18), "stage_moved", "pm", "Moved to Punch List.");

    const items = allLineItems(scopes);
    const totals = computeTotals(items, doc, data.changeOrders.filter((c) => c.jobId === jobId), SETTINGS.taxRate);

    if (reached("invoiced")) {
      const issued = at(Math.min(spec.ageDays - 1, 24));
      doc.kind = "invoice";
      doc.invoiceNumber = `INV-${data.nextInvoice++}`;
      doc.issuedAt = issued;
      const due = new Date(issued);
      due.setDate(due.getDate() + SETTINGS.paymentTermsDays);
      doc.dueAt = due.toISOString();
      log(jobId, issued, "invoice_issued", "accounting", `Invoice ${doc.invoiceNumber} issued for ${formatUSD(totals.total)}.`);
      log(jobId, issued, "stage_moved", "system", "Moved to Invoiced.");

      const share = spec.paidShare ?? 0;
      const parts = share >= 1 ? [0.5, 0.5] : share > 0 ? [share] : [];
      let paid = 0;
      parts.forEach((p, i) => {
        const amount = i === parts.length - 1 && share >= 1 ? totals.total - paid : Math.round(totals.total * p);
        paid += amount;
        const receivedAt = at(Math.min(spec.ageDays, 25 + i * 5), 14);
        const method = r.pick(["card", "check", "ach"] as const);
        data.payments.push({ id: `${jobId}-pay${i}`, jobId, amount, method, receivedAt });
        log(jobId, receivedAt, "payment_recorded", "accounting", `Payment of ${formatUSD(amount)} received by ${method === "ach" ? "bank transfer" : method}.`);
      });
      if (spec.stage === "closed") log(jobId, at(spec.ageDays, 15), "stage_moved", "accounting", "Moved to Closed.");
    }

    if (spec.costFactor) {
      const vendors = { material: "Rose City Supply", labor: "Plumbline crew", other: "Eastside Hauling" } as const;
      for (const cat of ["material", "labor", "other"] as const) {
        const forecast = totals.byCategory[cat].cost;
        if (forecast === 0) continue;
        // In-progress jobs log partial costs, so their factor is below 1.
        const jitter = r.between(0.96, 1.04);
        const amount = Math.round(forecast * spec.costFactor * (cat === "labor" ? jitter * 1.02 : jitter));
        data.actualCosts.push({ id: `${jobId}-ac-${cat}`, jobId, category: cat, amount, vendor: vendors[cat], date: at(16) });
      }
    }

    data.documents[jobId] = doc;
  });

  return data;
}
