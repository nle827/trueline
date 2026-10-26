"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { STAGE_LABEL } from "@/domain/types";
import { ScopeEditor } from "@/features/estimate/ScopeEditor";
import { ActivityLog } from "@/features/documents/ActivityLog";
import { DocumentActions } from "@/features/documents/DocumentActions";
import { DocumentSheet } from "@/features/documents/DocumentSheet";
import { JobMargin } from "@/features/margin/JobMargin";
import { jobView } from "@/state/selectors";
import { useApp } from "@/state/store";

export function JobScreen() {
  const { jobId } = useParams<{ jobId: string }>();
  const state = useApp();
  const view = useMemo(() => jobView(state, jobId), [state, jobId]);
  const [showCost, setShowCost] = useState(false);

  if (!view) {
    return (
      <div className="grid justify-items-start gap-3 py-12">
        <h1 className="font-expanded text-2xl font-black uppercase">Job not found</h1>
        <p className="text-soft">It may have been removed when the demo was reset.</p>
        <Link href="/board" className="font-semibold underline">Back to the board</Link>
      </div>
    );
  }

  const { job, customer } = view;
  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <Link href="/board" className="text-sm text-soft hover:underline">← Board</Link>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-expanded text-3xl font-black uppercase">{job.title}</h1>
          <span className="rounded-sm bg-graphite px-2 py-0.5 font-type text-xs uppercase text-white">{STAGE_LABEL[job.stage]}</span>
        </div>
        <p className="font-type text-sm text-soft">
          {job.number} · {customer.name} · {customer.address} · PM {job.pm} · Sales {job.rep}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid content-start gap-6">
          <ScopeEditor view={view} />
          <JobMargin view={view} />
        </div>
        <div className="grid content-start gap-6">
          <label className="flex items-center gap-2 justify-self-end text-xs font-semibold">
            <input id="show-cost" type="checkbox" checked={showCost} onChange={(e) => setShowCost(e.target.checked)} className="size-4 accent-carbon" />
            Show internal cost
          </label>
          <DocumentSheet view={view} showCost={showCost} />
          <DocumentActions view={view} />
        </div>
      </div>

      <ActivityLog view={view} />
    </div>
  );
}
