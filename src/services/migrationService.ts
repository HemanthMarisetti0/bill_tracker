import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";


interface MigrationResult {
  migrated: number;
  skipped: number;
  total: number;
}

/**
 * Migrate bills from the old structure:
 *
 * users/{userId}/bills/{billId}
 *
 * to the new shared household structure:
 *
 * households/{householdId}/bills/{billId}
 *
 * IMPORTANT:
 * - Old bills are NOT deleted.
 * - Existing bills in the household are skipped.
 * - The original bill ID is preserved.
 */
export async function migrateOldBills(
  userId: string,
  householdId: string,
): Promise<MigrationResult> {
  const oldBillsRef = collection(
    db,
    "users",
    userId,
    "bills",
  );

  const newBillsRef = collection(
    db,
    "households",
    householdId,
    "bills",
  );

  /*
   * Get all old bills.
   */
  const oldSnapshot =
    await getDocs(oldBillsRef);

  /*
   * Nothing to migrate.
   */
  if (oldSnapshot.empty) {
    return {
      migrated: 0,
      skipped: 0,
      total: 0,
    };
  }

  /*
   * Get existing household bills.
   *
   * This allows us to avoid creating
   * duplicate bills if migration is
   * accidentally run more than once.
   */
  const existingSnapshot =
    await getDocs(newBillsRef);

  const existingBillIds =
    new Set(
      existingSnapshot.docs.map(
        (document) =>
          document.id,
      ),
    );

  let migrated = 0;
  let skipped = 0;

  /*
   * Migrate each bill.
   */
  for (
    const oldDocument of oldSnapshot.docs
  ) {
    const billId =
      oldDocument.id;

    /*
     * Skip if the same bill already
     * exists in the household.
     */
    if (
      existingBillIds.has(
        billId,
      )
    ) {
      skipped++;
      continue;
    }

    const data =
      oldDocument.data();

    /*
     * Preserve the original bill
     * data and ID.
     *
     * We use setDoc instead of addDoc
     * so the old document ID is retained.
     */
    const newBillRef = doc(
      db,
      "households",
      householdId,
      "bills",
      billId,
    );

    await setDoc(
      newBillRef,
      {
        ...data,

        migratedFrom:
          `users/${userId}/bills/${billId}`,

        migratedAt:
          serverTimestamp(),
      },
    );

    migrated++;
  }

  return {
    migrated,
    skipped,
    total: oldSnapshot.size,
  };
}
