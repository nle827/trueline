"use client";

import type { JobView } from "@/state/selectors";
import { blocked } from "@/ui/toast";

/** Build the receipt PDF in the browser. The PDF library loads only when someone asks for it. */
export async function downloadReceipt(view: JobView) {
  try {
    const [{ pdf }, { ReceiptDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./ReceiptPdf")]);
    const blob = await pdf(<ReceiptDocument view={view} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${view.job.number}-receipt.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (err) {
    console.error(err);
    blocked("The receipt couldn't be generated. Try again.");
  }
}
