import { formatUSD, sum, type Cents } from "./money";
import { fail, ok, type Result } from "./result";
import type { Totals } from "./estimate";
import type { ChangeOrder, JobDocument, Payment } from "./types";

export type DisplayType = "Estimate" | "Invoice" | "Receipt";

export const paidToDate = (payments: Payment[]): Cents => sum(payments.map((p) => p.amount));

export const balanceDue = (totals: Totals, payments: Payment[]): Cents =>
  totals.total - paidToDate(payments);

export const isPaidInFull = (doc: JobDocument, totals: Totals, payments: Payment[]) =>
  doc.kind === "invoice" && totals.total > 0 && balanceDue(totals, payments) <= 0;

/** What the client sees at the top of the document. Derived, never stored. */
export function displayType(doc: JobDocument, totals: Totals, payments: Payment[]): DisplayType {
  if (doc.kind === "estimate") return "Estimate";
  return isPaidInFull(doc, totals, payments) ? "Receipt" : "Invoice";
}

export const isSold = (doc: JobDocument) => doc.kind === "invoice" || doc.status === "signed";

export function sendEstimate(doc: JobDocument, now: string, lineCount: number): Result<JobDocument> {
  if (doc.kind !== "estimate") return fail("This job has already been invoiced.");
  if (doc.status === "signed") return fail("The estimate is already signed.");
  if (lineCount === 0) return fail("Add at least one room before sending the estimate.");
  return ok({ ...doc, status: "sent", sentAt: now });
}

export function signEstimate(doc: JobDocument, now: string): Result<JobDocument> {
  if (doc.kind !== "estimate") return fail("This job has already been invoiced.");
  if (doc.status !== "sent") return fail("Send the estimate to the client before it can be signed.");
  return ok({ ...doc, status: "signed", signedAt: now });
}

export function convertToInvoice(
  doc: JobDocument,
  invoiceNumber: string,
  now: string,
  termsDays: number,
): Result<JobDocument> {
  if (doc.kind === "invoice") return fail("This job is already invoiced.");
  if (doc.status !== "signed") return fail("Only a signed estimate can become an invoice.");
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + termsDays);
  return ok({ ...doc, kind: "invoice", invoiceNumber, issuedAt: now, dueAt: due.toISOString() });
}

/**
 * Turn an invoice back into a signed estimate. Allowed only before money has changed hands,
 * so the books never show a payment against a document that no longer exists.
 */
export function revertToEstimate(
  doc: JobDocument,
  payments: Payment[],
  reason: string,
): Result<JobDocument> {
  if (doc.kind !== "invoice") return fail("Only an invoice can be reverted.");
  if (payments.length > 0)
    return fail(`${formatUSD(paidToDate(payments))} has been paid on this invoice. Record a refund or credit first.`);
  if (reason.trim().length < 3) return fail("Give a reason for reverting the invoice.");
  return ok({
    ...doc,
    kind: "estimate",
    status: "signed",
    invoiceNumber: undefined,
    issuedAt: undefined,
    dueAt: undefined,
    voidedInvoiceNumbers: doc.invoiceNumber
      ? [...doc.voidedInvoiceNumbers, doc.invoiceNumber]
      : doc.voidedInvoiceNumbers,
  });
}

export function validatePayment(
  doc: JobDocument,
  totals: Totals,
  payments: Payment[],
  amount: Cents,
): Result<Cents> {
  if (doc.kind !== "invoice") return fail("Convert the estimate to an invoice before taking payment.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Enter a payment amount above $0.");
  const balance = balanceDue(totals, payments);
  if (balance <= 0) return fail("This invoice is already paid in full.");
  if (amount > balance) return fail(`That's more than the ${formatUSD(balance)} balance due.`);
  return ok(amount);
}

export function proposeChangeOrder(
  doc: JobDocument,
  description: string,
  amount: Cents,
): Result<{ description: string; amount: Cents }> {
  if (!isSold(doc)) return fail("Adjustments can only be added after the estimate is signed. Edit the estimate instead.");
  if (description.trim().length < 3) return fail("Describe what changed.");
  if (!Number.isFinite(amount) || amount === 0) return fail("Enter an amount other than $0.");
  return ok({ description: description.trim(), amount });
}

export function decideChangeOrder(
  co: ChangeOrder,
  decision: "approved" | "rejected",
  now: string,
): Result<ChangeOrder> {
  if (co.status !== "proposed") return fail(`This adjustment was already ${co.status}.`);
  return ok({ ...co, status: decision, decidedAt: now });
}
