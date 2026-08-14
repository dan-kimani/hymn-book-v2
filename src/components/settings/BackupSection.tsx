import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { Text } from "@/components/common/Text";
import { useBackup } from "@/hooks/useBackup";
import { useFontScale } from "@/hooks/useFontScale";
import type { BackupFrequency } from "@/services/backup/scheduler";
import { theme } from "@/theme/colors";

const FREQUENCIES: { value: BackupFrequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ts: number | null): string {
  if (ts == null) return "Never";
  return new Date(ts).toLocaleString();
}

export function BackupSection() {
  const { body, captionSmall } = useFontScale();
  const {
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
  } = useBackup();

  const busy = status === "signingIn" || status === "backingUp" || status === "restoring";

  const confirmRestore = () => {
    Alert.alert(
      "Restore backup?",
      "This replaces your current data with the backup from Google Drive. Anything not yet backed up will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: restore },
      ],
    );
  };

  return (
    <View>
      <SectionLabel className="mb-3 ml-1">Backup</SectionLabel>
      <View className="rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-4 py-1 mb-8">
        {/* Account */}
        <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100/60 dark:border-slate-800/60">
          <View className="flex-1">
            <Text className="font-semibold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
              Google account
            </Text>
            <Text className="text-text-muted dark:text-gray-500 mt-0.5" style={{ fontSize: captionSmall }}>
              {signedIn ? (email ?? "Signed in") : "Sign in to back up to Google Drive"}
            </Text>
          </View>
          <Pressable
            onPress={signedIn ? signOut : signIn}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700"
          >
            <Text className="font-semibold text-primary" style={{ fontSize: captionSmall }}>
              {signedIn ? "Sign out" : "Sign in"}
            </Text>
          </Pressable>
        </View>

        {/* Auto-backup frequency */}
        <View className="py-2.5 border-b border-gray-100/60 dark:border-slate-800/60">
          <Text className="font-semibold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
            Auto-backup
          </Text>
          <Text className="text-text-muted dark:text-gray-500 mt-0.5 mb-2" style={{ fontSize: captionSmall }}>
            Back up automatically on this cadence when the app opens
          </Text>
          <View className="flex-row gap-2">
            {FREQUENCIES.map((f) => {
              const active = frequency === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFrequency(f.value)}
                  className={`flex-1 py-2 rounded-lg border items-center ${
                    active
                      ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`font-semibold ${active ? "text-primary" : "text-text-secondary dark:text-gray-400"}`}
                    style={{ fontSize: captionSmall }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Last backup */}
        <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100/60 dark:border-slate-800/60">
          <Text className="font-semibold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
            Last backup
          </Text>
          <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
            {formatTime(lastBackupAt)}
            {lastBackupSize != null ? ` · ${formatSize(lastBackupSize)}` : ""}
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row gap-2 py-2.5">
          <Pressable
            onPress={backUpNow}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-primary flex-row items-center justify-center gap-2"
          >
            {status === "backingUp" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
            )}
            <Text className="font-semibold text-white" style={{ fontSize: body }}>
              {status === "backingUp" ? "Backing up…" : "Back up now"}
            </Text>
          </Pressable>
          <Pressable
            onPress={confirmRestore}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 flex-row items-center justify-center gap-2"
          >
            {status === "restoring" ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="cloud-download-outline" size={16} color={theme.primary} />
            )}
            <Text className="font-semibold text-primary" style={{ fontSize: body }}>
              {status === "restoring" ? "Restoring…" : "Restore"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text className="text-red-500 dark:text-red-400 pb-2.5" style={{ fontSize: captionSmall }}>
            {error}
          </Text>
        ) : null}

        <Text className="text-text-muted dark:text-gray-500 pb-2.5" style={{ fontSize: captionSmall }}>
          Backups include your recordings, favorites, bookmarks, collections, recents, and settings.
        </Text>
      </View>
    </View>
  );
}
