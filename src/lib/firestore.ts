import { getFirestore } from "firebase/firestore";

import { app } from "./firebase";

/*
 * Kept apart from firebase.ts so the
 * Firestore SDK is only downloaded
 * once the user is signed in.
 */
export const db = getFirestore(app);
