"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { planMove } from "@/domain/board";
import {
  convertToInvoice,
  decideChangeOrder,
  proposeChangeOrder,
  revertToEstimate,
  sendEstimate,
  signEstimate,
  validatePayment,
} from "@/domain/document";
import { visibilityFor, type Actor, type EventType } from "@/domain/events";
import { formatSigned, formatUSD, type Cents } from "@/domain/money";
import { fail, ok, type Result } from "@/domain/result";
import { SETTINGS } from "@/domain/seed/company";
import { buildDemoData, type DemoData } from "@/domain/seed/demo";
import type { TradeScope } from "@/domain/trades";
import { STAGES, STAGE_LABEL, type JobDocument, type PaymentMethod, type Role, type Stage } from "@/domain/types";
import { jobView } from "./selectors";

export interface AppState extends DemoData {
  role: Role;
  setRole: (role: Role) => void;
  resetDemo: () => void;
  updateScopes: (jobId: string, scopes: TradeScope[]) => Result<void>;
  setDiscount: (jobId: string, discount: Cents) => Result<void>;
  sendEstimate: (jobId: string) => Result<void>;
  clientSign: (jobId: string) => Result<void>;
  convertToInvoice: (jobId: string) => Result<void>;
  revertInvoice: (jobId: string, reason: string) => Result<void>;
  recordPayment: (jobId: string, amount: Cents, method: PaymentMethod) => Result<void>;
  proposeAdjustment: (jobId: string, description: string, amount: Cents) => Result<void>;
  decideAdjustment: (changeOrderId: string, decision: "approved" | "rejected") => Result<void>;
  moveJob: (jobId: string, to: Stage, reason?: string) => Result<void>;
}

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const idx = (s: Stage) => STAGES.indexOf(s);

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const log = (jobId: string, type: EventType, actor: Actor, message: string) =>
        set((s) => ({
          events: [...s.events, { id: uid(), jobId, at: nowIso(), type, actor, message, visibility: visibilityFor(type) }],
        }));

      const putDoc = (doc: JobDocument) => set((s) => ({ documents: { ...s.documents, [doc.jobId]: doc } }));

      /** Move the card forward to match a document action, never backward. */
      const advanceTo = (jobId: string, stage: Stage) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || idx(job.stage) >= idx(stage)) return;
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, stage } : j)) }));
        log(jobId, "stage_moved", "system", `Moved to ${STAGE_LABEL[stage]}.`);
      };

      const setStage = (jobId: string, stage: Stage) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, stage } : j)) }));

      /** Editing a sent estimate pulls it back to draft so the client never signs a stale version. */
      const editableDoc = (jobId: string): Result<JobDocument> => {
        const doc = get().documents[jobId];
        if (doc.kind === "invoice" || doc.status === "signed")
          return fail("The signed estimate is locked. Add an adjustment instead.");
        return ok(doc);
      };

      const actions = {
        setRole: (role: Role) => set({ role }),

        resetDemo: () => set({ ...buildDemoData(), role: get().role }),

        updateScopes: (jobId: string, scopes: TradeScope[]) => {
          const r = editableDoc(jobId);
          if (!r.ok) return r;
          set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, scopes } : j)) }));
          if (r.value.status === "sent") {
            putDoc({ ...r.value, status: "draft", sentAt: undefined });
            log(jobId, "estimate_edited", "pm", "Estimate edited after sending. It's back to draft.");
          }
          return ok(undefined);
        },

        setDiscount: (jobId: string, discount: Cents) => {
          const r = editableDoc(jobId);
          if (!r.ok) return r;
          putDoc({ ...r.value, discount: Math.max(0, discount) });
          return ok(undefined);
        },

        sendEstimate: (jobId: string) => {
          const view = jobView(get(), jobId)!;
          const r = sendEstimate(view.doc, nowIso(), view.items.length);
          if (!r.ok) return r;
          putDoc(r.value);
          log(jobId, "estimate_sent", "pm", `Estimate for ${formatUSD(view.totals.total)} sent to the client.`);
          advanceTo(jobId, "estimating");
          return ok(undefined);
        },

        clientSign: (jobId: string) => {
          const view = jobView(get(), jobId)!;
          const r = signEstimate(view.doc, nowIso());
          if (!r.ok) return r;
          log(jobId, "estimate_viewed", "client", `${view.customer.name} viewed the estimate.`);
          putDoc(r.value);
          log(jobId, "estimate_signed", "client", `${view.customer.name} signed the estimate.`);
          advanceTo(jobId, "sold");
          return ok(undefined);
        },

        convertToInvoice: (jobId: string) => {
          const s = get();
          const view = jobView(s, jobId)!;
          const number = `INV-${s.nextInvoice}`;
          const r = convertToInvoice(view.doc, number, nowIso(), SETTINGS.paymentTermsDays);
          if (!r.ok) return r;
          set({ nextInvoice: s.nextInvoice + 1 });
          putDoc(r.value);
          log(jobId, "invoice_issued", "accounting", `Invoice ${number} issued for ${formatUSD(view.totals.total)}.`);
          advanceTo(jobId, "invoiced");
          return ok(undefined);
        },

        revertInvoice: (jobId: string, reason: string) => {
          const view = jobView(get(), jobId)!;
          const r = revertToEstimate(view.doc, view.payments, reason);
          if (!r.ok) return r;
          putDoc(r.value);
          log(jobId, "invoice_reverted", "accounting", `Invoice ${view.doc.invoiceNumber} voided and returned to estimate. Reason: ${reason.trim()}`);
          if (view.job.stage === "invoiced") {
            setStage(jobId, "punch_list");
            log(jobId, "stage_moved", "system", "Moved back to Punch List.");
          }
          return ok(undefined);
        },

        recordPayment: (jobId: string, amount: Cents, method: PaymentMethod) => {
          const view = jobView(get(), jobId)!;
          const r = validatePayment(view.doc, view.totals, view.payments, amount);
          if (!r.ok) return r;
          set((s) => ({ payments: [...s.payments, { id: uid(), jobId, amount, method, receivedAt: nowIso() }] }));
          log(jobId, "payment_recorded", "accounting", `Payment of ${formatUSD(amount)} received.`);
          return ok(undefined);
        },

        proposeAdjustment: (jobId: string, description: string, amount: Cents) => {
          const view = jobView(get(), jobId)!;
          const r = proposeChangeOrder(view.doc, description, amount);
          if (!r.ok) return r;
          set((s) => ({
            changeOrders: [...s.changeOrders, { id: uid(), jobId, ...r.value, status: "proposed", createdAt: nowIso() }],
          }));
          log(jobId, "adjustment_proposed", "pm", `Adjustment proposed: ${r.value.description} (${formatSigned(amount)}).`);
          return ok(undefined);
        },

        decideAdjustment: (changeOrderId: string, decision: "approved" | "rejected") => {
          const co = get().changeOrders.find((c) => c.id === changeOrderId);
          if (!co) return fail("That adjustment no longer exists.");
          const r = decideChangeOrder(co, decision, nowIso());
          if (!r.ok) return r;
          set((s) => ({ changeOrders: s.changeOrders.map((c) => (c.id === co.id ? r.value : c)) }));
          log(co.jobId, `adjustment_${decision}`, "client", `Adjustment ${decision}: ${co.description} (${formatSigned(co.amount)}).`);
          return ok(undefined);
        },

        moveJob: (jobId: string, to: Stage, reason?: string) => {
          const view = jobView(get(), jobId)!;
          const plan = planMove(
            { stage: view.job.stage, doc: view.doc, changeOrders: view.changeOrders, payments: view.payments, totals: view.totals },
            to,
          );
          if (!plan.ok) return plan;
          if (plan.value.needsReason && !reason?.trim()) return fail("Give a reason for moving the job back.");

          if (plan.value.effect === "revert_to_estimate") return actions.revertInvoice(jobId, reason!);
          if (plan.value.effect === "convert_to_invoice") {
            const r = actions.convertToInvoice(jobId);
            if (!r.ok) return r;
            // convertToInvoice already moved the card to Invoiced and logged it.
            if (to === "invoiced") return ok(undefined);
          }
          setStage(jobId, to);
          const suffix = reason?.trim() ? ` Reason: ${reason.trim()}` : "";
          log(jobId, "stage_moved", get().role, `Moved ${plan.value.direction === "back" ? "back " : ""}to ${STAGE_LABEL[to]}.${suffix}`);
          return ok(undefined);
        },
      };

      return { ...buildDemoData(), role: "pm" as Role, ...actions };
    },
    {
      name: "trueline-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Persist data only; actions are rebuilt on load.
        const { customers, jobs, documents, changeOrders, payments, actualCosts, events, nextInvoice, nextJobNumber, role } = s;
        return { customers, jobs, documents, changeOrders, payments, actualCosts, events, nextInvoice, nextJobNumber, role };
      },
    },
  ),
);
