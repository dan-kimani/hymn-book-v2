import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export function useRecorder(hymnId: string) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Track elapsed time while recording
  useEffect(() => {
    if (recorder.isRecording) {
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recorder.isRecording]);

  const start = useCallback(async () => {
    if (!permissionGranted) {
      Alert.alert("Permission needed", "Microphone access is required to record.");
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      setElapsed(0);
      recorder.record();
    } catch (e) {
      console.warn("Failed to start recording:", e);
      Alert.alert("Error", "Could not start recording.");
    }
  }, [permissionGranted, recorder]);

  const stop = useCallback(async (): Promise<{ path: string; duration: number } | null> => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;

      // Move recording to our managed directory
      const dir = `${FileSystem.documentDirectory}recordings/${hymnId}/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const id = Date.now().toString(36);
      const dest = `${dir}${id}.m4a`;
      await FileSystem.moveAsync({ from: uri, to: dest });

      const duration = recorder.currentTime ?? elapsed;
      return { path: dest, duration };
    } catch (e) {
      console.warn("Failed to stop recording:", e);
      return null;
    }
  }, [hymnId, elapsed, recorder]);

  return { isRecording, elapsed, permissionGranted, start, stop };
}

/**
 * Hook that returns a player for the given file and play/pause controls.
 */
export function usePlayback(filePath: string | null) {
  const player = useAudioPlayer(undefined); // start empty
  const status = useAudioPlayerStatus(player);
  const lastPath = useRef<string | null>(null);

  // Switch source when filePath changes
  useEffect(() => {
    if (filePath && filePath !== lastPath.current) {
      lastPath.current = filePath;
      player.replace(filePath);
    }
  }, [filePath, player]);

  const play = useCallback(() => {
    player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  return {
    isPlaying: status.playing,
    duration: status.duration,
    currentTime: status.currentTime,
    play,
    pause,
  };
}
