import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

import { db } from "../lib/firebase";
import { isMeterCategory } from "../lib/categories";
import {
  addMonths,
  getCurrentMonthKey,
  monthsBetween,
  toMonthKey,
} from "../lib/dates";

import type { Bill } from "../types/bill";

/*
 * For every recurring bill, adds an unpaid
 * copy for each month since the last copy,
 * up to and including the current month.
 *
 * Copies use a fixed id per template and
 * month, so two open tabs can't create
 * duplicates.
 *
 * Firestore path:
 *
 * users/{userId}/bills
 */
export async function generateRecurringBills(userId: string, bills: Bill[]) {
  const currentMonth = getCurrentMonthKey();

  const existingIds = new Set(bills.map((bill) => bill.id));

  const templates = bills.filter(
    (bill) => bill.recurring && bill.id && !isMeterCategory(bill.category),
  );

  for (const template of templates) {
    const templateMonth = toMonthKey(template.billingDate);

    /*
     * The template's own month counts as
     * done, even if its date was moved
     * past the last generated month.
     */
    const generatedThrough = template.recurringGeneratedThrough ?? "";

    const lastMonth =
      generatedThrough > templateMonth ? generatedThrough : templateMonth;

    const pending = monthsBetween(lastMonth, currentMonth);

    if (pending <= 0) {
      continue;
    }

    const batch = writeBatch(db);

    const startOffset = monthsBetween(templateMonth, lastMonth) + 1;

    for (let offset = startOffset; offset < startOffset + pending; offset++) {
      const billingDate = addMonths(template.billingDate, offset);

      const copyId = `${template.id}_${toMonthKey(billingDate)}`;

      if (existingIds.has(copyId)) {
        continue;
      }

      batch.set(doc(db, "users", userId, "bills", copyId), {
        category: template.category,
        billingDate,
        amount: template.amount,
        status: "unpaid",
        ...(template.dueDate
          ? { dueDate: addMonths(template.dueDate, offset) }
          : {}),
        ...(template.notes ? { notes: template.notes } : {}),
        recurringSourceId: template.id,
        createdAt: serverTimestamp(),
      });
    }

    batch.update(doc(db, "users", userId, "bills", template.id ?? ""), {
      recurringGeneratedThrough: currentMonth,
    });

    await batch.commit();
  }
}
