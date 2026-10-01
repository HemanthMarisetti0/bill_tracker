import { doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

import type { MeterCategory, MeterSetting, MeterSettings } from "../types/bill";

/*
 * Used until the user saves
 * their own meter settings.
 */
export const defaultMeterSettings: Record<MeterCategory, MeterSetting> = {
  water: {
    initialReading: 944515,
    rate: 0.13,
  },

  electricity: {
    initialReading: 0,
  },

  gas: {
    initialReading: 0,
  },
};

/*
 * Firestore path:
 *
 * users/{userId}/settings/meters
 */
function meterSettingsDoc(userId: string) {
  return doc(db, "users", userId, "settings", "meters");
}

export function getMeterSetting(
  settings: MeterSettings,
  category: MeterCategory,
): MeterSetting {
  return {
    ...defaultMeterSettings[category],
    ...settings[category],
  };
}

export function subscribeToMeterSettings(
  userId: string,
  onChange: (settings: MeterSettings) => void,
) {
  return onSnapshot(
    meterSettingsDoc(userId),
    (snapshot) => {
      onChange((snapshot.data() as MeterSettings | undefined) ?? {});
    },
    (error) => {
      console.error("Failed to load meter settings:", error);

      onChange({});
    },
  );
}

export async function saveMeterSettings(
  userId: string,
  settings: MeterSettings,
) {
  await setDoc(meterSettingsDoc(userId), settings);
}
