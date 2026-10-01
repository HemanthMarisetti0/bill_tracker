import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../lib/firestore";

import type { Profile } from "../types/bill";

/*
 * Firestore path:
 *
 * users/{userId}/settings/profile
 */
function profileDoc(userId: string) {
  return doc(db, "users", userId, "settings", "profile");
}

export function subscribeToProfile(
  userId: string,
  onChange: (profile: Profile) => void,
) {
  return onSnapshot(
    profileDoc(userId),
    (snapshot) => {
      onChange((snapshot.data() as Profile | undefined) ?? {});
    },
    (error) => {
      console.error("Failed to load profile:", error);

      onChange({});
    },
  );
}

export async function saveProfile(userId: string, profile: Profile) {
  await setDoc(profileDoc(userId), profile);
}
