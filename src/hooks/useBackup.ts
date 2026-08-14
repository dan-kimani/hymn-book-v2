import { useEffect, useState } from "react";

import { currentUserEmail, isSignedIn } from "@/services/drive/googleSignIn";
import {
  runBackup,
  runRestore,
  runSignIn,
  runSignOut,
} from "@/services/backup/runBackup";
import { useBackupStore } from "@/state/backupStore";

/** UI-facing hook: exposes backup state plus the actions a screen can trigger. */
export function useBackup() {
  const frequency = useBackupStore((s) => s.frequency);
  const setFrequency = useBackupStore((s) => s.setFrequency);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);
  const lastBackupSize = useBackupStore((s) => s.lastBackupSize);
  const status = useBackupStore((s) => s.status);
  const error = useBackupStore((s) => s.error);

  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setSignedIn(isSignedIn());
    setEmail(currentUserEmail());
  }, []);

  const refreshAuth = () => {
    setSignedIn(isSignedIn());
    setEmail(currentUserEmail());
  };

  const signIn = async (): Promise<boolean> => {
    const ok = await runSignIn();
    refreshAuth();
    return ok;
  };

  const signOut = async (): Promise<void> => {
    await runSignOut();
    refreshAuth();
  };

  // Refresh auth after backup/restore too — a backup/restore that signs the user in
  // internally must be reflected in the account row.
  const backUpNow = async (): Promise<void> => {
    await runBackup();
    refreshAuth();
  };

  const restore = async (): Promise<void> => {
    await runRestore();
    refreshAuth();
  };

  return {
    frequency,
    setFrequency,
    lastBackupAt,
    lastBackupSize,
    status,
    error,
    signedIn,
    email,
    signIn,
    signOut,
    backUpNow,
    restore,
  };
}
