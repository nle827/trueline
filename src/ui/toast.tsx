"use client";

import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";
import type { Result } from "@/domain/result";

interface Toast {
  id: number;
  tone: "info" | "blocked";
  text: string;
}

const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>(
  (set) => ({
    toasts: [],
    push: (t) => {
      const id = Date.now() + Math.random();
      set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
    },
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  }),
);

export const toast = (text: string) => useToasts.getState().push({ tone: "info", text });
export const blocked = (text: string) => useToasts.getState().push({ tone: "blocked", text });

/** Show the reason when an action is refused, or a confirmation when it goes through. */
export function report(result: Result<unknown>, success?: string) {
  if (!result.ok) blocked(result.reason);
  else if (success) toast(success);
  return result.ok;
}

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 16, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`pointer-events-auto max-w-md rounded-sm px-4 py-3 text-left text-sm shadow-lg ${
              t.tone === "blocked" ? "bg-stamp text-white" : "bg-graphite text-white"
            }`}
          >
            {t.tone === "blocked" && <span className="mr-2 font-type font-bold uppercase">Blocked</span>}
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
