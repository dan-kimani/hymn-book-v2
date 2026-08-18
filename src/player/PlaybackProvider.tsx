import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { AudioTagHandle } from "react-native-audio-api";
import { Audio, AudioManager, PlaybackNotificationManager } from "react-native-audio-api";

import { usePlayerStore, type DayRecording, type LoopMode } from "@/state/playerStore";

interface PlaybackContextValue {
  activeDayKey: string | null;
  currentHymnId: string | null;
  currentTitle: string | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playFrom: (dayKey: string, recordings: readonly DayRecording[], startIndex: number) => void;
  next: () => void;
  prev: () => void;
  seekTo: (seconds: number) => void;
  toggle: () => void;
  canNext: boolean;
  canPrev: boolean;
  loopMode: LoopMode;
  cycleLoop: () => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function toUri(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<AudioTagHandle>(null);
  const playing = usePlayerStore((s) => s.playing);
  const activeDayKey = usePlayerStore((s) => s.activeDayKey);
  const position = usePlayerStore((s) => s.position);
  const loopMode = usePlayerStore((s) => s.loopMode);
  const current = usePlayerStore((s) => s.queue[s.index] as DayRecording | undefined);
  const currentHymnId = current?.hymnId ?? null;
  // Stable source identity — changing it (track change) reloads the audio; a fresh object
  // each render would reload on every position tick and reset playback.
  const source = useMemo(() => (current ? { uri: toUri(current.path) } : null), [current?.path]);
  const currentTitle = current ? (current.title ?? current.hymnId) : null;
  const duration = current?.duration ?? 0;
  const index = usePlayerStore((s) => s.index);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const canPrev = queueLength > 1 && (index > 0 || loopMode === "all");
  const canNext = queueLength > 1 && (index + 1 < queueLength || loopMode === "all");

  const pause = useCallback(() => {
    usePlayerStore.getState().setDesiredPlaying(false);
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    usePlayerStore.getState().setDesiredPlaying(true);
    audioRef.current?.play();
  }, []);

  const stop = useCallback(() => {
    usePlayerStore.getState().reset();
    audioRef.current?.pause();
    PlaybackNotificationManager.hide();
  }, []);

  const next = useCallback(() => {
    const s = usePlayerStore.getState();
    if (s.index + 1 < s.queue.length) s.setIndex(s.index + 1);
    else if (s.loopMode === "all" && s.queue.length > 1) s.setIndex(0);
    else stop();
  }, [stop]);

  const prev = useCallback(() => {
    const s = usePlayerStore.getState();
    if (s.index - 1 >= 0) s.setIndex(s.index - 1);
    else if (s.loopMode === "all" && s.queue.length > 1) s.setIndex(s.queue.length - 1);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    audioRef.current?.seekToTime(seconds);
    usePlayerStore.getState().setPosition(seconds);
  }, []);

  const toggle = useCallback(() => {
    const s = usePlayerStore.getState();
    if (s.playing) pause();
    else resume();
  }, [pause, resume]);

  const cycleLoop = useCallback(() => {
    const s = usePlayerStore.getState();
    const nextMode: LoopMode = s.loopMode === "off" ? "all" : s.loopMode === "all" ? "one" : "off";
    s.setLoopMode(nextMode);
  }, []);

  const playFrom = useCallback(
    async (dayKey: string, recordings: readonly DayRecording[], startIndex: number) => {
      const s = usePlayerStore.getState();
      const currentTrack = s.queue[s.index] as DayRecording | undefined;
      const target = recordings[startIndex];
      if (currentTrack?.hymnId === target?.hymnId) {
        if (s.playing) pause();
        else resume();
        return;
      }
      await AudioManager.requestNotificationPermissions();
      s.setQueue([...recordings], startIndex);
      s.setDesiredPlaying(true);
      s.setActiveDay(dayKey);
    },
    [pause, resume],
  );

  // Show/update the media notification, then enable the controls it exposes.
  useEffect(() => {
    if (!current) return;
    PlaybackNotificationManager.show({
      title: current.title ?? current.hymnId,
      artist: current.bookName,
      duration: current.duration,
      elapsedTime: position,
      state: playing ? "playing" : "paused",
    })
      .then(() => {
        PlaybackNotificationManager.enableControl("play", true);
        PlaybackNotificationManager.enableControl("pause", true);
        PlaybackNotificationManager.enableControl("nextTrack", true);
        PlaybackNotificationManager.enableControl("previousTrack", true);
        PlaybackNotificationManager.enableControl("seekTo", true);
      })
      .catch(() => {});
  }, [current, playing, position]);

  // Handle remote commands from the notification / lock screen / headset.
  useEffect(() => {
    const playSub = PlaybackNotificationManager.addEventListener("playbackNotificationPlay", resume);
    const pauseSub = PlaybackNotificationManager.addEventListener("playbackNotificationPause", pause);
    const nextSub = PlaybackNotificationManager.addEventListener("playbackNotificationNextTrack", next);
    const prevSub = PlaybackNotificationManager.addEventListener("playbackNotificationPreviousTrack", prev);
    const seekSub = PlaybackNotificationManager.addEventListener("playbackNotificationSeekTo", (e) => seekTo(e.value));
    return () => {
      playSub?.remove();
      pauseSub?.remove();
      nextSub?.remove();
      prevSub?.remove();
      seekSub?.remove();
    };
  }, [resume, pause, next, prev, seekTo]);

  const value: PlaybackContextValue = {
    activeDayKey,
    currentHymnId,
    currentTitle,
    isPlaying: playing,
    position,
    duration,
    playFrom,
    next,
    prev,
    seekTo,
    toggle,
    canNext,
    canPrev,
    loopMode,
    cycleLoop,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      {source && (
        <Audio
          ref={audioRef}
          source={source}
          loop={loopMode === "one"}
          onLoad={() => {
            if (usePlayerStore.getState().desiredPlaying) audioRef.current?.play();
          }}
          onEnded={next}
          onError={() => next()}
          onPositionChange={(pos) => usePlayerStore.getState().setPosition(pos)}
          onPlay={() => usePlayerStore.getState().setPlaying(true)}
          onPause={() => usePlayerStore.getState().setPlaying(false)}
        />
      )}
    </PlaybackContext.Provider>
  );
}

export function useDayPlaylist(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("useDayPlaylist must be used within PlaybackProvider");
  return ctx;
}
