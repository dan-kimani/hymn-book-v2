import { useEffect } from "react";
import { AppState } from "react-native";

import { isSignedIn } from "@/services/drive/googleSignIn";
import { runBackup } from "@/services/backup/runBackup";
import { isBackupDue } from "@/services/backup/scheduler";
import { useBackupStore } from "@/state/backupStore";

/**
 * Checks whether a scheduled backup is due on launch and whenever the app
 * returns to the foreground. Runs silently — failures retry on the next check.
 */
export function useAutoBackup(): void {
  useEffect(() => {
    const check = () => {
      const { frequency, lastBackupAt, status } = useBackupStore.getState();
      if (status !== "idle") return;
      if (!isBackupDue(frequency, lastBackupAt)) return;
      if (!isSignedIn()) return;
      runBackup({ interactive: false }).catch(() => {});
    };

    // Wait for the persisted scheduling state to hydrate before the first check,
    // otherwise a persisted frequency may read as the default ("off") on launch.
    let unsub: (() => void) | undefined;
    if (useBackupStore.persist.hasHydrated()) {
      check();
    } else {
      unsub = useBackupStore.persist.onFinishHydration(() => check());
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      unsub?.();
      sub.remove();
    };
  }, []);
}
