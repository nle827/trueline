import { balanceDue, isSold } from "./document";
import { formatUSD } from "./money";
import { fail, ok, type Result } from "./result";
import type { Totals } from "./estimate";
import { STAGES, STAGE_LABEL, type ChangeOrder, type JobDocument, type Payment, type Stage } from "./types";

export interface MoveContext {
  stage: Stage;
  doc: JobDocument;
  changeOrders: ChangeOrder[];
  payments: Payment[];
  totals: Totals;
}

/** What else has to happen when the move is applied. */
export type MoveEffect = "none" | "convert_to_invoice" | "revert_to_estimate";

export interface MovePlan {
  to: Stage;
  direction: "forward" | "back";
  effect: MoveEffect;
  needsReason: boolean;
}

const index = (s: Stage) => STAGES.indexOf(s);

export function planMove(ctx: MoveContext, to: Stage): Result<MovePlan> {
  const from = ctx.stage;
  if (from === to) return fail("The job is already in that stage.");
  if (from === "closed") return fail("Closed jobs are locked.");

  const pending = ctx.changeOrders.find((c) => c.status === "proposed");
  if (pending && index(from) >= index("sold"))
    return fail(`Adjustment “${pending.description}” is waiting for approval. Approve or reject it first.`);

  if (index(to) < index(from)) return planBack(ctx, to);

  // Forward: any distance, as long as the target stage's entry rules are met.
  if (index(to) >= index("sold") && !isSold(ctx.doc))
    return fail(`The estimate has to be signed before the job can move to ${STAGE_LABEL[to]}.`);

  if (to === "closed") {
    if (ctx.doc.kind !== "invoice") return fail("Invoice the job before closing it.");
    const balance = balanceDue(ctx.totals, ctx.payments);
    if (balance > 0) return fail(`${formatUSD(balance)} is still due. Jobs close once they're paid in full.`);
  }

  const effect: MoveEffect =
    index(to) >= index("invoiced") && ctx.doc.kind === "estimate" ? "convert_to_invoice" : "none";
  return ok({ to, direction: "forward", effect, needsReason: false });
}

function planBack(ctx: MoveContext, to: Stage): Result<MovePlan> {
  const from = ctx.stage;
  if (index(from) - index(to) > 1) return fail("Jobs move back one stage at a time.");
  if (from === "sold" && isSold(ctx.doc))
    return fail("A signed estimate can't go back to Estimating. Use an adjustment to change the price.");

  let effect: MoveEffect = "none";
  if (from === "invoiced" && ctx.doc.kind === "invoice") {
    if (ctx.payments.length > 0)
      return fail("Payments have been recorded on this invoice, so it can't go back to Punch List. Record a refund first.");
    effect = "revert_to_estimate";
  }
  return ok({ to, direction: "back", effect, needsReason: true });
}
