"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { COMPANY } from "@/domain/seed/company";
import type { Role } from "@/domain/types";
import { useApp } from "@/state/store";
import { useHydrated } from "@/state/useHydrated";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Segmented } from "@/ui/Segmented";
import { toast, Toaster } from "@/ui/toast";
import { CASE_STUDY_URL } from "./links";

const NAV = [
  { href: "/board", label: "Board" },
  { href: "/margins", label: "Margins" },
  { href: CASE_STUDY_URL, label: "Case study" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const role = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const resetDemo = useApp((s) => s.resetDemo);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky z-30 border-b border-rule bg-panel/95 backdrop-blur"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-expanded text-xl font-black uppercase tracking-tight">Trueline</span>
            <span className="hidden font-type text-xs text-soft sm:inline">for {COMPANY.name}</span>
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href) || (n.href === "/board" && pathname.startsWith("/jobs"));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-sm px-3 py-1.5 text-sm font-semibold ${active ? "bg-graphite text-white" : "hover:bg-black/5"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Segmented<Role>
              label="Viewing as"
              value={role}
              onChange={(r) => {
                setRole(r);
                toast(r === "pm" ? "Viewing as project manager. Commission is hidden." : "Viewing as accounting. Commission is shown.");
              }}
              options={[
                { value: "pm", label: "PM view" },
                { value: "accounting", label: "Accounting" },
              ]}
            />
            <Button variant="ghost" className="text-xs" onClick={() => setConfirmReset(true)}>
              Reset demo
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
        {hydrated ? children : <LoadingSheet />}
      </main>

      <Dialog
        open={confirmReset}
        title="Reset the demo?"
        body="All your changes are cleared and the eleven sample jobs come back as they started."
        confirmLabel="Reset demo"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo();
          setConfirmReset(false);
          toast("Demo reset.");
        }}
      />
      <Toaster />
    </div>
  );
}

function LoadingSheet() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading demo data">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-sm bg-black/5" />
      ))}
    </div>
  );
}
