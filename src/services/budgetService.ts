import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

import type { Budgets } from "../types/bill";

/*
 * Firestore path:
 *
 * users/{userId}/settings/budgets
 */
function budgetsDoc(userId: string) {
  return doc(db, "users", userId, "settings", "budgets");
}

export function subscribeToBudgets(
  userId: string,
  onChange: (budgets: Budgets) => void,
) {
  return onSnapshot(
    budgetsDoc(userId),
    (snapshot) => {
      onChange((snapshot.data() as Budgets | undefined) ?? {});
    },
    (error) => {
      console.error("Failed to load budgets:", error);

      onChange({});
    },
  );
}

export async function saveBudgets(userId: string, budgets: Budgets) {
  await setDoc(budgetsDoc(userId), budgets);
}
