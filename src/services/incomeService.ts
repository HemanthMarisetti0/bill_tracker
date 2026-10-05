import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firestore";

import type { Income } from "../types/bill";

type IncomeInput = Omit<Income, "id" | "createdAt">;

/*
 * Firestore path:
 *
 * users/{userId}/income
 */
function incomeCollection(userId: string) {
  return collection(db, "users", userId, "income");
}

export function subscribeToIncome(
  userId: string,
  onChange: (income: Income[]) => void,
) {
  return onSnapshot(
    query(incomeCollection(userId), orderBy("date", "desc")),
    (snapshot) => {
      onChange(
        snapshot.docs.map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Income,
        ),
      );
    },
    (error) => {
      console.error("Failed to load income:", error);

      onChange([]);
    },
  );
}

export async function addIncome(userId: string, income: IncomeInput) {
  const { notes, ...rest } = income;

  return addDoc(incomeCollection(userId), {
    ...rest,
    ...(notes ? { notes } : {}),
    createdAt: serverTimestamp(),
  });
}

export async function updateIncome(
  userId: string,
  incomeId: string,
  income: IncomeInput,
) {
  await updateDoc(doc(db, "users", userId, "income", incomeId), {
    ...income,
    notes: income.notes || deleteField(),
  });
}

export async function deleteIncome(userId: string, incomeId: string) {
  await deleteDoc(doc(db, "users", userId, "income", incomeId));
}
