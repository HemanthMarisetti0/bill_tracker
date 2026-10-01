import type { Bill } from "../types/bill";

/*
 * Formats a local date as YYYY-MM-DD.
 * toISOString() would shift the day
 * for timezones ahead of UTC.
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return toDateString(new Date());
}

/*
 * Unpaid with a due date before today.
 * Dates are YYYY-MM-DD, so string
 * comparison orders correctly.
 */
export function isOverdue(bill: Bill, today = getToday()): boolean {
  return bill.status === "unpaid" && !!bill.dueDate && bill.dueDate < today;
}

/*
 * Month key as YYYY-MM.
 */
export function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getCurrentMonthKey(): string {
  return toMonthKey(getToday());
}

/*
 * Whole months from one YYYY-MM key
 * to another (negative if "to" is earlier).
 */
export function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);

  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/*
 * Shifts a YYYY-MM-DD date by whole months,
 * clamping the day to the target month's
 * length (31 Jan + 1 month = 28/29 Feb).
 */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);

  const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();

  return toDateString(
    new Date(year, month - 1 + months, Math.min(day, lastDay)),
  );
}
