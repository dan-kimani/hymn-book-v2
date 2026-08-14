import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { sanitizeFileName } from "@/utils/filename";

export function useRecorder(hymnId: string, title?: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHymnIdRef = useRef(hymnId);
  const startTitleRef = useRef(title);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Request permission on mount
  useEffect(() => {
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        setPermissionGranted(granted);
      } catch {
        setPermissionGranted(false);
      }
    })();
  }, []);

  const start = useCallback(async () => {
    if (!permissionGranted) {
      Alert.alert("Permission needed", "Microphone access is required to record.");
      return;
    }
    try {
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      recorder.record();
      startHymnIdRef.current = hymnId;
      startTitleRef.current = title;
      setIsRecording(true);
      elapsedRef.current = 0;
      setElapsed(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not start recording.");
    }
  }, [permissionGranted, recorder, hymnId, title]);

  const stop = useCallback(async (): Promise<{ path: string; duration: number; hymnId: string; title: string } | null> => {
    const duration = elapsedRef.current;
    const recordedHymnId = startHymnIdRef.current;
    const recordedTitle = startTitleRef.current;

    // Stop the timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    try {
      await recorder.stop();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to stop recording.");
      return null;
    }

    // Small delay — the native layer may need a tick to finalize the file
    await new Promise((r) => setTimeout(r, 100));

    const uri = recorder.uri;
    if (!uri) {
      Alert.alert("Error", "No recording file found.");
      return null;
    }

    // Copy to managed directory for persistence, fall back to original URI
    try {
      // The hymnId contains a colon (e.g. "roho-mutheru:42") — use a filesystem-safe
      // directory name so the copy into the document directory succeeds.
      const safeId = recordedHymnId.replace(/:/g, "-");
      const dir = `${FileSystem.documentDirectory}recordings/${safeId}/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const base = sanitizeFileName(recordedTitle ?? "") || "recording";
      const dest = `${dir}${base}.m4a`;
      // Re-recording overwrites the same file — remove any existing one first.
      await FileSystem.deleteAsync(dest, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: dest });
      return { path: dest, duration, hymnId: recordedHymnId, title: recordedTitle ?? "" };
    } catch (e: any) {
      // Surface the real reason the copy failed so we can fix it.
      Alert.alert("Recording copy failed", e?.message ?? String(e));
      return { path: uri, duration, hymnId: recordedHymnId, title: recordedTitle ?? "" };
    }
  }, [recorder]);

  // Cleanup on unmount — only clear the timer. The recorder is released by
  // useAudioRecorder's own cleanup, so calling recorder.stop() here would
  // touch a released native object and crash.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { isRecording, elapsed, start, stop };
}
