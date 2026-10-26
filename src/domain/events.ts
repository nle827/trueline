export type Actor = "pm" | "accounting" | "client" | "system";
export type Visibility = "internal" | "client";

export type EventType =
  | "job_created"
  | "estimate_edited"
  | "estimate_sent"
  | "estimate_viewed"
  | "estimate_signed"
  | "invoice_issued"
  | "invoice_reverted"
  | "payment_recorded"
  | "adjustment_proposed"
  | "adjustment_approved"
  | "adjustment_rejected"
  | "stage_moved";

export interface JobEvent {
  id: string;
  jobId: string;
  at: string;
  actor: Actor;
  type: EventType;
  message: string;
  visibility: Visibility;
}

/** Which event types the client is allowed to see. Everything else stays internal. */
const CLIENT_VISIBLE: ReadonlySet<EventType> = new Set([
  "estimate_sent",
  "estimate_viewed",
  "estimate_signed",
  "invoice_issued",
  "payment_recorded",
  "adjustment_approved",
  "adjustment_rejected",
]);

export const visibilityFor = (type: EventType): Visibility =>
  CLIENT_VISIBLE.has(type) ? "client" : "internal";

export const clientFeed = (events: JobEvent[]) => events.filter((e) => e.visibility === "client");

/** Events logged in the same instant keep their logical order (last logged shows first). */
export const newestFirst = (events: JobEvent[]) =>
  [...events].reverse().sort((a, b) => b.at.localeCompare(a.at));
