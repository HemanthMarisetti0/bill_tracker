import type { Timestamp } from "firebase/firestore";

export type BillCategory =
  | "water"
  | "electricity"
  | "gas"
  | "internet"
  | "rent"
  | "maintenance"
  | "mobile"
  | "other";

export type BillStatus = "paid" | "unpaid";

export interface Bill {
  id?: string;

  category: BillCategory;

  billingDate: string;

  previousReading?: number;

  currentReading?: number;

  consumption?: number;

  unit?: string;

  rate?: number;

  amount: number;

  status: BillStatus;

  paymentDate?: string;

  notes?: string;

  createdAt?: Timestamp;
}