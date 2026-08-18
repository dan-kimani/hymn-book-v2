import { getAccessToken, signIn as driveSignIn, signInSilently, signOut as driveSignOut } from "@/services/drive/googleSignIn";
import { listBackup, uploadBackup } from "@/services/drive/driveApi";
import { useBackupStore } from "@/state/backupStore";
import { createBackupArchive } from "./createBackup";
import { restoreBackup } from "./restoreBackup";

// Guards against a double run (e.g. manual tap racing the auto-backup check).
let inFlight = false;

/**
 * Signs in silently if possible, else (only when `interactive`) prompts. Returns a Drive
 * access token, or `null` when the user isn't signed in and we must not prompt.
 */
async function ensureSignedIn(interactive: boolean): Promise<string | null> {
  if (await signInSilently()) return getAccessToken();
  if (!interactive) return null;
  const ok = await driveSignIn();
  if (!ok) return null; // cancelled — not an error
  return getAccessToken();
}

/** Creates a fresh snapshot and uploads it to Drive's app-data folder. */
export async function runBackup(opts: { interactive?: boolean } = {}): Promise<void> {
  const interactive = opts.interactive ?? true;
  if (inFlight) return;
  inFlight = true;
  try {
    useBackupStore.getState().setStatus("backingUp");
    const token = await ensureSignedIn(interactive);
    if (!token) {
      useBackupStore.getState().setStatus("idle");
      return;
    }
    const archive = await createBackupArchive();
    const existing = await listBackup(token);
    await uploadBackup(token, {
      fileId: existing?.id ?? null,
      fileUri: archive.uri,
      size: archive.size,
    });
    useBackupStore.getState().markBackedUp(archive.size);
  } catch (e: any) {
    useBackupStore.getState().setError(e?.message ?? "Backup failed");
  } finally {
    inFlight = false;
  }
}

/** Downloads and applies the latest backup from Drive. */
export async function runRestore(opts: { interactive?: boolean } = {}): Promise<void> {
  const interactive = opts.interactive ?? true;
  if (inFlight) return;
  inFlight = true;
  try {
    useBackupStore.getState().setStatus("restoring");
    const token = await ensureSignedIn(interactive);
    if (!token) {
      useBackupStore.getState().setStatus("idle");
      return;
    }
    await restoreBackup(token);
    useBackupStore.getState().setStatus("idle");
  } catch (e: any) {
    useBackupStore.getState().setError(e?.message ?? "Restore failed");
  } finally {
    inFlight = false;
  }
}

/** Explicit sign-in from the UI. Resolves `false` if cancelled or it fails. */
export async function runSignIn(): Promise<boolean> {
  try {
    useBackupStore.getState().setStatus("signingIn");
    const ok = await driveSignIn();
    useBackupStore.getState().setStatus("idle");
    return ok;
  } catch (e: any) {
    useBackupStore.getState().setError(e?.message ?? "Sign-in failed");
    return false;
  }
}

export async function runSignOut(): Promise<void> {
  await driveSignOut();
  useBackupStore.getState().setStatus("idle");
}
