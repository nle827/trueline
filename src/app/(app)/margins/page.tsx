import type { Metadata } from "next";
import { MarginDashboard } from "@/features/margin/MarginDashboard";

export const metadata: Metadata = { title: "Margins" };

export default function MarginsPage() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-expanded text-3xl font-black uppercase">Margins</h1>
        <p className="text-sm text-soft">
          Every sold job, forecast vs. actual, against the target for its trades. Use the toggle in the header to switch between the PM and Accounting views.
        </p>
      </div>
      <MarginDashboard />
    </div>
  );
}
