import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../lib/firestore";

import type { CategorySettings } from "../types/bill";

/*
 * Firestore path:
 *
 * users/{userId}/settings/categories
 */
function categorySettingsDoc(userId: string) {
  return doc(db, "users", userId, "settings", "categories");
}

export function subscribeToCategorySettings(
  userId: string,
  onChange: (settings: CategorySettings) => void,
) {
  return onSnapshot(
    categorySettingsDoc(userId),
    (snapshot) => {
      onChange((snapshot.data() as CategorySettings | undefined) ?? {});
    },
    (error) => {
      console.error("Failed to load bill types:", error);

      onChange({});
    },
  );
}

export async function saveCategorySettings(
  userId: string,
  settings: CategorySettings,
) {
  await setDoc(categorySettingsDoc(userId), settings);
}
