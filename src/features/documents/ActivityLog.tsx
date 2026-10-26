"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { clientFeed, type Actor } from "@/domain/events";
import type { JobView } from "@/state/selectors";
import { Segmented } from "@/ui/Segmented";

const ACTOR_LABEL: Record<Actor, string> = { pm: "PM", accounting: "Accounting", client: "Client", system: "System" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function ActivityLog({ view }: { view: JobView }) {
  const [audience, setAudience] = useState<"internal" | "client">("internal");
  const events = audience === "client" ? clientFeed(view.events) : view.events;

  return (
    <section className="grid gap-3 rounded-sm border border-rule bg-panel p-4" aria-labelledby="activity-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="activity-title" className="font-expanded text-lg font-extrabold uppercase">Activity</h2>
        <Segmented
          label="Audience"
          value={audience}
          onChange={setAudience}
          options={[
            { value: "internal", label: "Internal log" },
            { value: "client", label: "What the client sees" },
          ]}
        />
      </div>
      <p className="text-xs text-soft">
        {audience === "client"
          ? "The client sees signing, invoice, payment and adjustment events only."
          : "Every action on the job, newest first. Entries can't be edited."}
      </p>
      <ol className="grid gap-1">
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[7.5rem_5.5rem_1fr] items-baseline gap-2 border-b border-dashed border-rule py-1.5 text-sm max-sm:grid-cols-[1fr_auto]"
            >
              <time dateTime={e.at} className="font-type text-xs text-soft">{when(e.at)}</time>
              <span className="justify-self-start rounded-sm bg-black/5 px-1.5 font-type text-[11px] uppercase">{ACTOR_LABEL[e.actor]}</span>
              <span className="max-sm:col-span-2">{e.message}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}
