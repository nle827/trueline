import type { Metadata } from "next";
import { Board } from "@/features/board/Board";

export const metadata: Metadata = { title: "Board" };

export default function BoardPage() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-expanded text-3xl font-black uppercase">Job board</h1>
          <p className="text-sm text-soft">
            Drag a job to move it. Moves that break a rule are blocked and the reason is shown. Open a job to edit its estimate.
          </p>
        </div>
        <p className="flex gap-3 font-type text-xs text-soft">
          <span><i className="mr-1 inline-block size-3 border border-rule bg-copy-white align-middle" />Estimate</span>
          <span><i className="mr-1 inline-block size-3 bg-copy-canary align-middle" />Invoice</span>
          <span><i className="mr-1 inline-block size-3 bg-copy-pink align-middle" />Receipt</span>
        </p>
      </div>
      <Board />
    </div>
  );
}
