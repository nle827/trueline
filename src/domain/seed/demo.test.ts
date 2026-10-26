import { describe, expect, it } from "vitest";
import { balanceDue, isSold } from "../document";
import { computeTotals } from "../estimate";
import { allLineItems } from "../trades";
import { STAGES } from "../types";
import { SETTINGS } from "./company";
import { buildDemoData } from "./demo";

const now = new Date("2026-10-23T12:00:00");
const data = buildDemoData(now);

describe("demo data", () => {
  it("is deterministic", () => {
    expect(buildDemoData(now)).toEqual(data);
  });

  it("has about ten jobs spread across most stages", () => {
    expect(data.jobs.length).toBeGreaterThanOrEqual(10);
    expect(new Set(data.jobs.map((j) => j.stage)).size).toBeGreaterThanOrEqual(7);
  });

  it("keeps every job consistent with the board rules", () => {
    for (const job of data.jobs) {
      const doc = data.documents[job.id];
      const totals = computeTotals(
        allLineItems(job.scopes),
        doc,
        data.changeOrders.filter((c) => c.jobId === job.id),
        SETTINGS.taxRate,
      );
      const payments = data.payments.filter((p) => p.jobId === job.id);
      const stage = STAGES.indexOf(job.stage);

      expect(totals.total, job.number).toBeGreaterThan(0);
      if (stage >= STAGES.indexOf("sold")) expect(isSold(doc), job.number).toBe(true);
      if (stage >= STAGES.indexOf("invoiced")) expect(doc.kind, job.number).toBe("invoice");
      if (job.stage === "closed") expect(balanceDue(totals, payments), job.number).toBe(0);
      expect(balanceDue(totals, payments), job.number).toBeGreaterThanOrEqual(0);
    }
  });

  it("never dates anything in the future", () => {
    for (const e of data.events) expect(new Date(e.at).getTime()).toBeLessThanOrEqual(now.getTime() + 86400000);
  });
});
