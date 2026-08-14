import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BackupFrequency } from "@/services/backup/scheduler";

export type BackupStatus = "idle" | "signingIn" | "backingUp" | "restoring";

interface BackupState {
  frequency: BackupFrequency;
  lastBackupAt: number | null;
  lastBackupSize: number | null;
  status: BackupStatus;
  error: string | null;

  setFrequency: (frequency: BackupFrequency) => void;
  setStatus: (status: BackupStatus) => void;
  setError: (error: string | null) => void;
  markBackedUp: (size: number) => void;
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      frequency: "off",
      lastBackupAt: null,
      lastBackupSize: null,
      status: "idle",
      error: null,

      setFrequency: (frequency) => set({ frequency }),
      setStatus: (status) => set({ status, error: null }),
      setError: (error) => set({ error, status: "idle" }),
      markBackedUp: (size) =>
        set({
          lastBackupAt: Date.now(),
          lastBackupSize: size,
          status: "idle",
          error: null,
        }),
    }),
    {
      // Device-local scheduling state — intentionally NOT part of the backup manifest.
      name: "nyimbonakirikaniro-backup",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only scheduling state. `status`/`error` are transient runtime state and
      // must not survive a restart — otherwise a process killed mid-backup would rehydrate
      // into a permanent "backingUp" that nothing resets.
      partialize: (state) => ({
        frequency: state.frequency,
        lastBackupAt: state.lastBackupAt,
        lastBackupSize: state.lastBackupSize,
      }),
    },
  ),
);
