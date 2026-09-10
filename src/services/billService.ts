import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

import type { Bill } from "../types/bill";

function billsCollection(userId: string) {
  return collection(
    db,
    "users",
    userId,
    "bills",
  );
}

export async function addBill(
  userId: string,
  bill: Omit<Bill, "id" | "createdAt">,
) {
  return addDoc(
    billsCollection(userId),
    {
      ...bill,
      createdAt: serverTimestamp(),
    },
  );
}

export async function getBills(
  userId: string,
): Promise<Bill[]> {
  const billsRef =
    billsCollection(userId);

  const billsQuery = query(
    billsRef,
    orderBy(
      "billingDate",
      "desc",
    ),
  );

  const snapshot =
    await getDocs(billsQuery);

  return snapshot.docs.map(
    (document) =>
      ({
        id: document.id,
        ...document.data(),
      }) as Bill,
  );
}

export async function updateBill(
  userId: string,
  billId: string,
  bill: Partial<Bill>,
) {
  const billRef = doc(
    db,
    "users",
    userId,
    "bills",
    billId,
  );

  await updateDoc(
    billRef,
    bill,
  );
}

export async function deleteBill(
  userId: string,
  billId: string,
) {
  const billRef = doc(
    db,
    "users",
    userId,
    "bills",
    billId,
  );

  await deleteDoc(billRef);
}
