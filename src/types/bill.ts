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
  | "movies"
  | "education"
  | "credit-card"
  | "investments"
  | "taxes"
  | "donations"
  | "assets"
  | "groceries"
  | "meat-fish"
  | "bakery"
  | "milk"
  | "drinking-water"
  | "juice"
  | "fruits"
  | "vegetables"
  | "food"
  | "medical"
  | "shopping"
  | "grooming"
  | "domestic-help"
  | "laundry"
  | "gym"
  | "pets"
  | "kids"
  | "petrol"
  | "vehicle"
  | "parking-tolls"
  | "travel"
  | "pooja"
  | "gifts"
  | "other";

export type BillStatus = "paid" | "unpaid";

/*
 * A built-in category, or the id of a
 * type the user added themselves.
 */
export type CategoryId = BillCategory | (string & {});

export interface Bill {
  id?: string;

  category: CategoryId;

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
export type Budgets = Partial<Record<CategoryId, number>>;

/*
 * Per-user profile preferences.
 */
export interface Profile {
  /*
   * What the app calls the user,
   * e.g. in the welcome message.
   */
  preferredName?: string;
}

/*
 * A bill type the user added.
 */
export interface CustomCategory {
  id: string;

  label: string;

  icon: string;

  /*
   * Label of the category group
   * it is listed under.
   */
  group: string;
}

/*
 * Per-user bill type preferences.
 */
export interface CategorySettings {
  custom?: CustomCategory[];

  /*
   * Types left out of pickers
   * and filters.
   */
  hidden?: CategoryId[];
}

export type IncomeSource =
  | "salary"
  | "bonus"
  | "freelance"
  | "rental"
  | "interest"
  | "other";

export interface Income {
  id?: string;

  source: IncomeSource;

  amount: number;

  /*
   * Date the money was received
   * (YYYY-MM-DD).
   */
  date: string;

  notes?: string;

  createdAt?: Timestamp;
}
