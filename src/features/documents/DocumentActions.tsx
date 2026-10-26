"use client";

import { useState } from "react";
import { dollars, formatSigned, formatUSD } from "@/domain/money";
import type { PaymentMethod } from "@/domain/types";
import type { JobView } from "@/state/selectors";
import { useApp } from "@/state/store";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { report } from "@/ui/toast";
import { downloadReceipt } from "./downloadReceipt";

const input = "rounded-sm border border-rule bg-copy-white px-2 py-1.5 font-type text-sm";

export function DocumentActions({ view }: { view: JobView }) {
  const s = useApp();
  const id = view.job.id;
  const { doc } = view;
  const [revertOpen, setRevertOpen] = useState(false);

  return (
    <section className="grid gap-4 rounded-sm border border-rule bg-panel p-4" aria-labelledby="actions-title">
      <h2 id="actions-title" className="font-expanded text-lg font-extrabold uppercase">Next step</h2>

      {doc.kind === "estimate" && doc.status === "draft" && (
        <Step text="Review the line items, then send the estimate to the client.">
          <Button variant="primary" onClick={() => report(s.sendEstimate(id), "Estimate sent.")}>Send estimate</Button>
          <DiscountField view={view} />
        </Step>
      )}
      {doc.kind === "estimate" && doc.status === "sent" && (
        <Step text="Waiting on the client. In the real product they sign from a link. Here you can play the client.">
          <Button variant="primary" onClick={() => report(s.clientSign(id), "Signed by the client.")}>Sign as client</Button>
          <DiscountField view={view} />
        </Step>
      )}
      {doc.kind === "estimate" && doc.status === "signed" && (
        <Step text="The estimate is signed. Convert it to an invoice when you're ready to bill.">
          <Button variant="primary" onClick={() => report(s.convertToInvoice(id), "Invoice issued.")}>Convert to invoice</Button>
        </Step>
      )}
      {view.displayType === "Invoice" && (
        <Step text={`Balance due ${formatUSD(view.balance)}.`}>
          <PaymentForm view={view} />
          <Button variant="danger" onClick={() => setRevertOpen(true)}>Revert to estimate</Button>
        </Step>
      )}
      {view.displayType === "Receipt" && (
        <Step text="Paid in full. The receipt is ready.">
          <Button variant="primary" onClick={() => downloadReceipt(view)}>Download receipt (PDF)</Button>
        </Step>
      )}

      <Adjustments view={view} />

      <Dialog
        open={revertOpen}
        title="Revert to estimate?"
        body={`Invoice ${doc.invoiceNumber} will be voided and the job returns to a signed estimate. This is only allowed before any payment is recorded.`}
        reasonLabel="Reason"
        confirmLabel="Revert invoice"
        tone="danger"
        onCancel={() => setRevertOpen(false)}
        onConfirm={(reason) => {
          setRevertOpen(false);
          report(s.revertInvoice(id, reason), "Invoice voided.");
        }}
      />
    </section>
  );
}

function Step({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-soft">{text}</p>
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}

function DiscountField({ view }: { view: JobView }) {
  const setDiscount = useApp((s) => s.setDiscount);
  return (
    <label className="ml-auto grid gap-1 text-xs font-semibold">
      Discount ($)
      <input
        id={`${view.job.id}-discount`}
        type="number"
        min={0}
        step={50}
        value={view.doc.discount / 100}
        onChange={(e) => report(setDiscount(view.job.id, dollars(Number(e.target.value) || 0)))}
        className={`${input} w-28 tabular`}
      />
    </label>
  );
}

function PaymentForm({ view }: { view: JobView }) {
  const recordPayment = useApp((s) => s.recordPayment);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = amount === "" ? view.balance : dollars(Number(amount));
        if (report(recordPayment(view.job.id, value, method), `Payment of ${formatUSD(value)} recorded.`)) setAmount("");
      }}
    >
      <label className="grid gap-1 text-xs font-semibold">
        Amount ($)
        <input
          id={`${view.job.id}-pay-amount`}
          type="number"
          min={0}
          step="0.01"
          placeholder={(view.balance / 100).toFixed(2)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`${input} w-32 tabular`}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Method
        <select id={`${view.job.id}-pay-method`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={input}>
          <option value="card">Card</option>
          <option value="check">Check</option>
          <option value="ach">Bank transfer</option>
          <option value="financing">Financing</option>
        </select>
      </label>
      <Button type="submit" variant="primary">Record payment</Button>
    </form>
  );
}

function Adjustments({ view }: { view: JobView }) {
  const s = useApp();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const sold = view.doc.kind === "invoice" || view.doc.status === "signed";
  if (!sold) return null;

  return (
    <div className="grid gap-3 border-t border-rule pt-4">
      <h3 className="text-sm font-bold">
        Adjustments <span className="font-normal text-soft">(change orders)</span>
      </h3>
      {view.changeOrders.length === 0 && <p className="text-sm text-soft">No adjustments on this job.</p>}
      <ul className="grid gap-2">
        {view.changeOrders.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-sm bg-black/[0.03] px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">{c.description}</span>
            <span className="font-type tabular">{formatSigned(c.amount)}</span>
            {c.status === "proposed" ? (
              <>
                <Button className="px-2 py-1 text-xs" onClick={() => report(s.decideAdjustment(c.id, "approved"), "Adjustment approved.")}>
                  Approve as client
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => report(s.decideAdjustment(c.id, "rejected"), "Adjustment rejected.")}>
                  Reject
                </Button>
              </>
            ) : (
              <span className={`rounded-sm px-2 py-0.5 font-type text-xs uppercase ${c.status === "approved" ? "bg-ok/10 text-ok" : "bg-black/5 text-soft"}`}>
                {c.status}
              </span>
            )}
          </li>
        ))}
      </ul>
      {view.displayType !== "Receipt" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (report(s.proposeAdjustment(view.job.id, desc, dollars(Number(amount) || 0)), "Adjustment proposed. The job can't change stage until it's decided.")) {
              setDesc("");
              setAmount("");
            }
          }}
        >
          <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold">
            What changed
            <input id={`${view.job.id}-co-desc`} value={desc} onChange={(e) => setDesc(e.target.value)} className={input} placeholder="Add pantry shelving" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Amount ($, minus for credit)
            <input id={`${view.job.id}-co-amount`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} w-32 tabular`} />
          </label>
          <Button type="submit">Propose</Button>
        </form>
      )}
    </div>
  );
}
