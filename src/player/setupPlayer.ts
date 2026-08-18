import TrackPlayer, { Capability, Event } from "react-native-track-player";

import { usePlayerStore } from "@/state/playerStore";

let setupPromise: Promise<void> | null = null;

/** One-time player setup + media notification capabilities. Safe to call repeatedly. */
export function setupPlayer(): Promise<void> {
  setupPromise ??= (async () => {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
    });
    // When the day queue finishes (stop-at-end), clear the active day so its
    // button flips back to "play" and tapping it restarts the queue.
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      usePlayerStore.getState().setActiveDay(null);
    });
  })().catch((e) => {
    setupPromise = null; // allow a retry on the next call
    throw e;
  });
  return setupPromise;
}
