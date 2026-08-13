import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export function useRecorder(hymnId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHymnIdRef = useRef(hymnId);

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
  }, [permissionGranted, recorder, hymnId]);

  const stop = useCallback(async (): Promise<{ path: string; duration: number; hymnId: string } | null> => {
    const duration = elapsedRef.current;
    const recordedHymnId = startHymnIdRef.current;

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
      const dir = `${FileSystem.documentDirectory}recordings/${recordedHymnId}/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}${Date.now().toString(36)}.m4a`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return { path: dest, duration, hymnId: recordedHymnId };
    } catch {
      return { path: uri, duration, hymnId: recordedHymnId };
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
