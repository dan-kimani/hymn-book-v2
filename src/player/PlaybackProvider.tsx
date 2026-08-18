import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  shuffle: boolean;
  toggleShuffle: () => void;
  speed: number;
  cycleSpeed: () => void;
  sleepMinutes: number | null;
  cycleSleepTimer: () => void;
  queue: DayRecording[];
  index: number;
  jumpTo: (index: number) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

function toUri(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stable-per-path source identity. A path must always resolve to the SAME object
// so a slot that preloads track N keeps its source identity when N becomes the live
// track — otherwise the <Audio> would reload it (the gap gapless playback removes).
const sourceCache = new Map<string, { uri: string }>();
function sourceFor(rec: DayRecording | undefined): { uri: string } | null {
  if (!rec) return null;
  let src = sourceCache.get(rec.path);
  if (!src) {
    src = { uri: toUri(rec.path) };
    sourceCache.set(rec.path, src);
  }
  return src;
}

const SPEEDS = [1, 1.25, 1.5, 0.75];

export function PlaybackProvider({ children }: { children: ReactNode }) {
  // Two <Audio> slots alternate as "live" (audible) vs "preload" (next track, decoded
  // ahead). Flipping liveIsA swaps roles without remounting the slot that holds the
  // upcoming track, so the next hymn starts the instant the current one ends.
  const audioARef = useRef<AudioTagHandle>(null);
  const audioBRef = useRef<AudioTagHandle>(null);
  const [liveIsA, setLiveIsA] = useState(true);

  const playing = usePlayerStore((s) => s.playing);
  const activeDayKey = usePlayerStore((s) => s.activeDayKey);
  const position = usePlayerStore((s) => s.position);
  const loopMode = usePlayerStore((s) => s.loopMode);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const speed = usePlayerStore((s) => s.speed);
  const sleepMinutes = usePlayerStore((s) => s.sleepMinutes);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const current = queue[index] as DayRecording | undefined;
  const currentHymnId = current?.hymnId ?? null;
  const currentTitle = current ? (current.title ?? current.hymnId) : null;
  const duration = current?.duration ?? 0;

  const nextTrack = useMemo<DayRecording | undefined>(() => {
    if (loopMode === "one" || queue.length < 2) return undefined;
    if (index + 1 < queue.length) return queue[index + 1] as DayRecording | undefined;
    if (loopMode === "all") return queue[0] as DayRecording | undefined;
    return undefined;
  }, [loopMode, index, queue]);

  const liveSource = sourceFor(current);
  const preloadSource = sourceFor(nextTrack);
  const slotASource = liveIsA ? liveSource : preloadSource;
  const slotBSource = liveIsA ? preloadSource : liveSource;

  const canPrev = queue.length > 1 && (index > 0 || loopMode === "all");
  const canNext = queue.length > 1 && (index + 1 < queue.length || loopMode === "all");

  const pause = useCallback(() => {
    usePlayerStore.getState().setDesiredPlaying(false);
    (liveIsA ? audioARef.current : audioBRef.current)?.pause();
  }, [liveIsA]);

  const resume = useCallback(() => {
    usePlayerStore.getState().setDesiredPlaying(true);
    (liveIsA ? audioARef.current : audioBRef.current)?.play();
  }, [liveIsA]);

  const stop = useCallback(() => {
    usePlayerStore.getState().reset();
    audioARef.current?.pause();
    audioBRef.current?.pause();
    PlaybackNotificationManager.hide();
  }, []);

  const next = useCallback(() => {
    const s = usePlayerStore.getState();
    const shouldPlay = s.desiredPlaying;
    if (s.index + 1 < s.queue.length) s.setIndex(s.index + 1);
    else if (s.loopMode === "all" && s.queue.length > 1) s.setIndex(0);
    else {
      stop();
      return;
    }
    // The preload slot already holds the next track decoded. Pause the current slot,
    // swap roles, and start the preloaded one immediately — no reload gap.
    (liveIsA ? audioARef.current : audioBRef.current)?.pause();
    setLiveIsA((v) => !v);
    if (shouldPlay) (liveIsA ? audioBRef.current : audioARef.current)?.play();
  }, [liveIsA, stop]);

  const prev = useCallback(() => {
    const s = usePlayerStore.getState();
    if (s.index - 1 >= 0) s.setIndex(s.index - 1);
    else if (s.loopMode === "all" && s.queue.length > 1) s.setIndex(s.queue.length - 1);
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      (liveIsA ? audioARef.current : audioBRef.current)?.seekToTime(seconds);
      usePlayerStore.getState().setPosition(seconds);
    },
    [liveIsA],
  );

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

  const toggleShuffle = useCallback(() => {
    const s = usePlayerStore.getState();
    s.setShuffle(!s.shuffle);
  }, []);

  const cycleSpeed = useCallback(() => {
    const s = usePlayerStore.getState();
    const idx = SPEEDS.indexOf(s.speed);
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    s.setSpeed(nextSpeed);
    audioARef.current?.setPlaybackRate(nextSpeed);
    audioBRef.current?.setPlaybackRate(nextSpeed);
  }, []);

  const cycleSleepTimer = useCallback(() => {
    const s = usePlayerStore.getState();
    const cur = s.sleepMinutes;
    let nextMinutes: number | null;
    if (cur == null) nextMinutes = 15;
    else if (cur === 15) nextMinutes = 30;
    else if (cur === 30) nextMinutes = 60;
    else nextMinutes = null;
    s.setSleepMinutes(nextMinutes);
  }, []);

  const jumpTo = useCallback((i: number) => {
    const s = usePlayerStore.getState();
    if (i === s.index || i < 0 || i >= s.queue.length) return;
    s.setIndex(i);
    s.setDesiredPlaying(true);
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
      const list = s.shuffle ? shuffleArray([...recordings]) : [...recordings];
      const start = s.shuffle
        ? Math.max(
            0,
            list.findIndex((r) => r.hymnId === recordings[startIndex]?.hymnId),
          )
        : startIndex;
      s.setQueue(list, start);
      s.setDesiredPlaying(true);
      s.setActiveDay(dayKey);
    },
    [pause, resume],
  );

  // Live slot finished loading: apply speed, then auto-play when playback is desired
  // (fresh play / jump / prev). No autoplay without a user gesture.
  const handleLiveLoad = useCallback(() => {
    const s = usePlayerStore.getState();
    const live = liveIsA ? audioARef.current : audioBRef.current;
    live?.setPlaybackRate(s.speed);
    if (s.desiredPlaying) live?.play();
  }, [liveIsA]);

  // Preload slot finished decoding: just match the current speed. It never auto-plays.
  const handlePreloadLoad = useCallback(() => {
    const s = usePlayerStore.getState();
    (liveIsA ? audioBRef.current : audioARef.current)?.setPlaybackRate(s.speed);
  }, [liveIsA]);

  const handlePosition = useCallback((pos: number) => {
    usePlayerStore.getState().setPosition(pos);
  }, []);

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

  // Sleep timer — stop playback after the selected duration.
  useEffect(() => {
    if (sleepMinutes == null) return;
    const timer = setTimeout(() => {
      stop();
      usePlayerStore.getState().setSleepMinutes(null);
    }, sleepMinutes * 60000);
    return () => clearTimeout(timer);
  }, [sleepMinutes, stop]);

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
    shuffle,
    toggleShuffle,
    speed,
    cycleSpeed,
    sleepMinutes,
    cycleSleepTimer,
    queue,
    index,
    jumpTo,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      {slotASource && (
        <Audio
          ref={audioARef}
          source={slotASource}
          loop={loopMode === "one"}
          onLoad={liveIsA ? handleLiveLoad : handlePreloadLoad}
          onEnded={liveIsA ? next : undefined}
          onError={liveIsA ? () => next() : undefined}
          onPositionChange={handlePosition}
          onPlay={() => usePlayerStore.getState().setPlaying(true)}
          onPause={() => usePlayerStore.getState().setPlaying(false)}
        />
      )}
      {slotBSource && (
        <Audio
          ref={audioBRef}
          source={slotBSource}
          loop={loopMode === "one"}
          onLoad={liveIsA ? handlePreloadLoad : handleLiveLoad}
          onEnded={liveIsA ? undefined : next}
          onError={liveIsA ? undefined : () => next()}
          onPositionChange={handlePosition}
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
