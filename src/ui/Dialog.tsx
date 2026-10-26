"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  /** When set, the dialog asks for a reason and passes it to onConfirm. */
  reasonLabel?: string;
  tone?: "default" | "danger";
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function Dialog({ open, title, body, confirmLabel, reasonLabel, tone = "default", onConfirm, onCancel }: DialogProps) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    setReason("");
    const t = setTimeout(() => (reasonLabel ? inputRef.current : confirmRef.current)?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, reasonLabel, onCancel]);

  const canConfirm = !reasonLabel || reason.trim().length >= 3;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-graphite/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="perforated w-full max-w-md rounded-sm bg-copy-white p-6 pt-7 shadow-2xl"
            initial={{ y: 24, rotate: -1, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
          >
            <h2 id={titleId} className="font-expanded text-xl font-extrabold uppercase">
              {title}
            </h2>
            {body && <div className="mt-2 text-sm text-soft">{body}</div>}
            <form
              className="mt-4 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canConfirm) onConfirm(reason.trim());
              }}
            >
              {reasonLabel && (
                <label className="grid gap-1 text-sm font-semibold">
                  {reasonLabel}
                  <textarea
                    ref={inputRef}
                    id="dialog-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="rounded-sm border border-rule bg-panel p-2 font-type text-base font-normal"
                  />
                </label>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
                <Button ref={confirmRef} type="submit" variant={tone === "danger" ? "danger" : "primary"} disabled={!canConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
