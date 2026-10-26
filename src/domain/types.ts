import type { Cents } from "./money";
import type { Category, TradeId, TradeScope } from "./trades/types";

export type Role = "pm" | "accounting";

export const STAGES = [
  "lead",
  "estimating",
  "sold",
  "scheduled",
  "in_progress",
  "punch_list",
  "invoiced",
  "closed",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  estimating: "Estimating",
  sold: "Sold",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  punch_list: "Punch List",
  invoiced: "Invoiced",
  closed: "Closed",
};

export interface Customer {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface Job {
  id: string;
  number: string; // TL-1042
  customerId: string;
  title: string;
  stage: Stage;
  pm: string;
  rep: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  scopes: TradeScope[];
}

export type EstimateStatus = "draft" | "sent" | "signed" | "declined";

/** One per job. Starts life as an estimate and becomes an invoice. */
export interface JobDocument {
  jobId: string;
  kind: "estimate" | "invoice";
  status: EstimateStatus;
  discount: Cents;
  sentAt?: string;
  signedAt?: string;
  invoiceNumber?: string;
  issuedAt?: string;
  dueAt?: string;
  voidedInvoiceNumbers: string[];
}

export type ChangeOrderStatus = "proposed" | "approved" | "rejected";

export interface ChangeOrder {
  id: string;
  jobId: string;
  description: string;
  amount: Cents; // positive adds to the price, negative is a credit
  status: ChangeOrderStatus;
  createdAt: string;
  decidedAt?: string;
}

export type PaymentMethod = "card" | "check" | "ach" | "financing";

export interface Payment {
  id: string;
  jobId: string;
  amount: Cents;
  method: PaymentMethod;
  receivedAt: string;
}

export interface ActualCost {
  id: string;
  jobId: string;
  category: Category;
  amount: Cents;
  vendor: string;
  date: string;
}

export interface MarginTarget {
  tradeId: TradeId;
  percent: number; // 0–100
  effectiveFrom: string; // ISO date
  note: string;
}

export interface CompanySettings {
  taxRate: number; // applied to material price only
  commissionRate: number; // share of revenue paid to the sales rep
  paymentTermsDays: number;
}
