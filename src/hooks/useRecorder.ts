import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  return { isRecording, elapsed, start, stop };
}

/**
 * Hook that returns a player for the given file and play/pause controls.
 */
export function usePlayback(filePath: string | null) {
  const uri = filePath
    ? filePath.startsWith("/") && !filePath.includes("://") ? `file://${filePath}` : filePath
    : null;

  const player = useAudioPlayer(uri ? { uri } : undefined);
  const status = useAudioPlayerStatus(player);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<string | null>(null);
  const manualPlayRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Stop the tick timer when the audio reaches the end, clamping to the duration.
  useEffect(() => {
    if (!status.didJustFinish) return;
    const end = player.duration || elapsedRef.current;
    setIsPlaying(false);
    clearTimer();
    elapsedRef.current = end;
    setCurrentTime(end);
  }, [status.didJustFinish, player]);

  // Auto-play when uri changes
  useEffect(() => {
    if (!uri || startedRef.current === uri) return;
    startedRef.current = uri;
    manualPlayRef.current = false;
    clearTimer();

    const t = setTimeout(() => {
      if (manualPlayRef.current) return; // user already toggled playback
      player.play();
      setIsPlaying(true);
      elapsedRef.current = 0;
      setCurrentTime(0);
    }, 300);
    return () => clearTimeout(t);
  }, [uri]);

  // Tick elapsed time while playing
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 0.5;
        setCurrentTime(elapsedRef.current);
      }, 500);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      manualPlayRef.current = true;
      player.play();
      elapsedRef.current = currentTime;
      setIsPlaying(true);
    }
  }, [player, isPlaying, currentTime]);

  const stop = useCallback(() => {
    player.pause();
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
    setCurrentTime(0);
  }, [player]);

  // Reset on unmount
  useEffect(() => clearTimer, []);

  return { isPlaying, currentTime, toggle, stop };
}
