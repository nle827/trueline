import { balanceDue, displayType, paidToDate } from "@/domain/document";
import { computeTotals } from "@/domain/estimate";
import { newestFirst } from "@/domain/events";
import { computeMargin } from "@/domain/margin";
import { MARGIN_TARGETS, SETTINGS } from "@/domain/seed/company";
import type { DemoData } from "@/domain/seed/demo";
import { allLineItems } from "@/domain/trades";
import { STAGES, type Role } from "@/domain/types";

/** Everything a screen needs about one job, derived from stored facts. */
export function jobView(state: DemoData, jobId: string) {
  const job = state.jobs.find((j) => j.id === jobId);
  if (!job) return undefined;
  const customer = state.customers.find((c) => c.id === job.customerId)!;
  const doc = state.documents[jobId];
  const changeOrders = state.changeOrders.filter((c) => c.jobId === jobId);
  const payments = state.payments.filter((p) => p.jobId === jobId);
  const actualCosts = state.actualCosts.filter((a) => a.jobId === jobId);
  const events = newestFirst(state.events.filter((e) => e.jobId === jobId));
  const items = allLineItems(job.scopes);
  const totals = computeTotals(items, doc, changeOrders, SETTINGS.taxRate);
  return {
    job,
    customer,
    doc,
    changeOrders,
    payments,
    actualCosts,
    events,
    items,
    totals,
    paid: paidToDate(payments),
    balance: balanceDue(totals, payments),
    displayType: displayType(doc, totals, payments),
  };
}

export type JobView = NonNullable<ReturnType<typeof jobView>>;

export function marginFor(view: JobView, role: Role) {
  return computeMargin(
    {
      items: view.items,
      totals: view.totals,
      actualCosts: view.actualCosts,
      targets: MARGIN_TARGETS,
      commissionRate: SETTINGS.commissionRate,
      asOf: (view.doc.signedAt ?? view.job.createdAt).slice(0, 10),
      costsFinal: STAGES.indexOf(view.job.stage) >= STAGES.indexOf("punch_list"),
    },
    role,
  );
}
