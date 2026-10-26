"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { planMove, type MovePlan } from "@/domain/board";
import { formatUSDWhole } from "@/domain/money";
import { TRADES } from "@/domain/trades";
import { STAGES, STAGE_LABEL, type Stage } from "@/domain/types";
import { jobView, type JobView } from "@/state/selectors";
import { useApp } from "@/state/store";
import { Dialog } from "@/ui/Dialog";
import { blocked, report } from "@/ui/toast";
import { PAPER } from "@/features/documents/paper";

interface Pending {
  jobId: string;
  plan: MovePlan;
}

export function Board() {
  const state = useApp();
  const views = useMemo(
    () => state.jobs.map((j) => jobView(state, j.id)!),
    // Recompute whenever any stored record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.jobs, state.documents, state.changeOrders, state.payments],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = (s: Stage) => views.filter((v) => v.job.stage === s);
  const active = views.find((v) => v.job.id === activeId);

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const to = e.over?.id as Stage | undefined;
    const view = views.find((v) => v.job.id === e.active.id);
    if (!to || !view || view.job.stage === to) return;
    const plan = planMove(
      { stage: view.job.stage, doc: view.doc, changeOrders: view.changeOrders, payments: view.payments, totals: view.totals },
      to,
    );
    if (!plan.ok) return blocked(`${view.job.number}: ${plan.reason}`);
    if (plan.value.needsReason || plan.value.effect !== "none") return setPending({ jobId: view.job.id, plan: plan.value });
    report(state.moveJob(view.job.id, to), `${view.job.number} moved to ${STAGE_LABEL[to]}.`);
  }

  const pendingView = pending && views.find((v) => v.job.id === pending.jobId);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up job ${active.id}.`,
            onDragOver: ({ over }) => (over ? `Over ${STAGE_LABEL[over.id as Stage]}.` : "Not over a stage."),
            onDragEnd: ({ over }) => (over ? `Dropped on ${STAGE_LABEL[over.id as Stage]}.` : "Dropped."),
            onDragCancel: () => "Move cancelled.",
          },
        }}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3">
            {STAGES.map((s) => (
              <Column key={s} stage={s} views={byStage(s)} activeId={activeId} />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active ? (
            <motion.div initial={{ rotate: 0, scale: 1 }} animate={{ rotate: -3, scale: 1.04 }} className="shadow-2xl">
              <CardBody view={active} />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={!!pendingView}
        title={
          pending?.plan.effect === "convert_to_invoice"
            ? "Issue the invoice?"
            : pending?.plan.effect === "revert_to_estimate"
              ? "Revert the invoice?"
              : `Move back to ${pending ? STAGE_LABEL[pending.plan.to] : ""}?`
        }
        body={
          pendingView &&
          (pending!.plan.effect === "convert_to_invoice"
            ? `Moving ${pendingView.job.number} to ${STAGE_LABEL[pending!.plan.to]} turns the signed estimate into an invoice for ${formatUSDWhole(pendingView.totals.total)}.`
            : pending!.plan.effect === "revert_to_estimate"
              ? `Invoice ${pendingView.doc.invoiceNumber} will be voided and the job goes back to Punch List. Nothing has been paid on it yet.`
              : "Moving a job backward is logged with your reason.")
        }
        reasonLabel={pending?.plan.needsReason ? "Reason" : undefined}
        confirmLabel={pending?.plan.effect === "convert_to_invoice" ? "Issue invoice" : "Move job"}
        tone={pending?.plan.effect === "revert_to_estimate" ? "danger" : "default"}
        onCancel={() => setPending(null)}
        onConfirm={(reason) => {
          if (!pending || !pendingView) return;
          report(state.moveJob(pending.jobId, pending.plan.to, reason), `${pendingView.job.number} moved to ${STAGE_LABEL[pending.plan.to]}.`);
          setPending(null);
        }}
      />
    </>
  );
}

function Column({ stage, views, activeId }: { stage: Stage; views: JobView[]; activeId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = views.reduce((t, v) => t + v.totals.total, 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={STAGE_LABEL[stage]}
      className={`flex min-h-[60vh] flex-col gap-2 rounded-sm p-2 transition-colors ${isOver ? "bg-carbon/10 ring-2 ring-carbon" : "bg-black/[0.035]"}`}
    >
      <header className="flex items-baseline justify-between px-1 pb-1">
        <h2 className="font-expanded text-xs font-extrabold uppercase tracking-wide">{STAGE_LABEL[stage]}</h2>
        <span className="font-type text-xs text-soft">
          {views.length} · {formatUSDWhole(total)}
        </span>
      </header>
      {views.length === 0 && (
        <p className="rounded-sm border border-dashed border-rule p-3 text-center text-xs text-soft">Drop a job here</p>
      )}
      {views.map((v) => (
        <Card key={v.job.id} view={v} hidden={activeId === v.job.id} />
      ))}
    </section>
  );
}

function Card({ view, hidden }: { view: JobView; hidden: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: view.job.id });
  return (
    <motion.div
      layout
      layoutId={view.job.id}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable job card"
      aria-label={`${view.job.number}, ${view.customer.name}, ${view.job.title}`}
      className={`touch-none cursor-grab active:cursor-grabbing ${hidden ? "opacity-30" : ""}`}
    >
      <CardBody view={view} linked />
    </motion.div>
  );
}

function CardBody({ view, linked }: { view: JobView; linked?: boolean }) {
  const pendingCo = view.changeOrders.find((c) => c.status === "proposed");
  const paper = PAPER[view.displayType];
  const title = linked ? (
    <Link href={`/jobs/${view.job.id}`} className="font-semibold leading-tight hover:underline" onPointerDown={(e) => e.stopPropagation()}>
      {view.job.title}
    </Link>
  ) : (
    <span className="font-semibold leading-tight">{view.job.title}</span>
  );
  return (
    <article className="perforated grid gap-1.5 rounded-sm p-3 pt-4 text-sm shadow-sm" style={{ background: paper.bg }}>
      <div className="flex items-center justify-between font-type text-xs text-carbon">
        <span>{view.job.number}</span>
        <span className="uppercase">{view.displayType}</span>
      </div>
      {title}
      <span className="text-xs text-soft">{view.customer.name}</span>
      <div className="mt-1 flex items-center justify-between">
        <span className="flex gap-1">
          {view.job.scopes.map((s) => (
            <span key={s.tradeId} className="rounded-sm bg-black/[0.06] px-1.5 py-0.5 font-type text-[11px]" title={TRADES[s.tradeId].name}>
              {TRADES[s.tradeId].code}
            </span>
          ))}
        </span>
        <span className="font-type font-bold tabular">{formatUSDWhole(view.totals.total)}</span>
      </div>
      {view.doc.kind === "invoice" && view.balance > 0 && (
        <span className="font-type text-xs text-carbon">Balance {formatUSDWhole(view.balance)}</span>
      )}
      {pendingCo && (
        <span className="mt-1 rounded-sm bg-stamp/10 px-2 py-1 text-xs font-semibold text-stamp">
          Adjustment waiting: {pendingCo.description}
        </span>
      )}
    </article>
  );
}
