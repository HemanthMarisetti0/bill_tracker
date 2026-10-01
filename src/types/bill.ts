import type { Timestamp } from "firebase/firestore";

export type BillCategory =
  | "water"
  | "electricity"
  | "gas"
  | "internet"
  | "mobile"
  | "dth"
  | "rent"
  | "maintenance"
  | "emi"
  | "insurance"
  | "subscriptions"
  | "education"
  | "assets"
  | "groceries"
  | "milk"
  | "drinking-water"
  | "juice"
  | "food"
  | "medical"
  | "shopping"
  | "domestic-help"
  | "petrol"
  | "vehicle"
  | "travel"
  | "pooja"
  | "gifts"
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

  dueDate?: string;

  notes?: string;

  /*
   * A recurring bill is the template for
   * an unpaid copy added every month.
   */
  recurring?: boolean;

  /*
   * Last month (YYYY-MM) copies were
   * created for, so deleted copies
   * aren't created again.
   */
  recurringGeneratedThrough?: string;

  /*
   * Set on copies: the id of the
   * recurring bill they came from.
   */
  recurringSourceId?: string;

  createdAt?: Timestamp;
}

export type MeterCategory = "water" | "electricity" | "gas";

export interface MeterSetting {
  initialReading?: number;

  rate?: number;
}

export type MeterSettings = Partial<Record<MeterCategory, MeterSetting>>;

/*
 * Monthly spending limit per category, in ₹.
 */
export type Budgets = Partial<Record<BillCategory, number>>;
