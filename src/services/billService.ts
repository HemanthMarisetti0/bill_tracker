import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firestore";

import type { Bill } from "../types/bill";

type BillInput = Omit<Bill, "id" | "createdAt">;

/*
 * Optional fields that may be missing
 * from a bill, e.g. paymentDate on an
 * unpaid bill or readings on a rent bill.
 */
const optionalBillFields = [
  "previousReading",
  "currentReading",
  "consumption",
  "unit",
  "rate",
  "paymentDate",
  "paymentMethod",
  "dueDate",
  "notes",
  "recurring",
] as const;

/*
 * Firestore rejects undefined values,
 * so drop them before writing.
 */
function withoutUndefined(bill: BillInput) {
  return Object.fromEntries(
    Object.entries(bill).filter(([, value]) => value !== undefined),
  );
}

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
  bill: BillInput,
) {
  return addDoc(
    billsCollection(userId),
    {
      ...withoutUndefined(bill),
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
  bill: BillInput,
) {
  const billRef = doc(
    db,
    "users",
    userId,
    "bills",
    billId,
  );

  /*
   * Remove optional fields the edited
   * bill no longer has, so stale values
   * (an old payment date, old readings)
   * don't stay on the document.
   */
  const removedFields = Object.fromEntries(
    optionalBillFields
      .filter((field) => bill[field] === undefined)
      .map((field) => [field, deleteField()]),
  );

  await updateDoc(
    billRef,
    {
      ...withoutUndefined(bill),
      ...removedFields,
    },
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
