export type BackupFrequency = "off" | "daily" | "weekly" | "monthly";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FREQUENCY_MS: Record<Exclude<BackupFrequency, "off">, number> = {
  daily: DAY_MS,
  weekly: 7 * DAY_MS,
  monthly: 30 * DAY_MS,
};

/** True when enough time has passed since the last successful backup. */
export function isBackupDue(
  frequency: BackupFrequency,
  lastBackupAt: number | null,
  now: number = Date.now(),
): boolean {
  if (frequency === "off") return false;
  if (lastBackupAt == null) return true;
  // Guard against a persisted value outside the union (corrupt/newer build); avoid NaN.
  const interval = (FREQUENCY_MS as Record<string, number | undefined>)[frequency];
  return interval != null && now - lastBackupAt >= interval;
}
