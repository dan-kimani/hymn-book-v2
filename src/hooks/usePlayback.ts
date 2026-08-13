import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook that returns a player for the given file and play/pause controls.
 */
export function usePlayback(filePath: string | null) {
  const uri = filePath ? (filePath.startsWith("/") && !filePath.includes("://") ? `file://${filePath}` : filePath) : null;

  const player = useAudioPlayer(uri ? { uri } : undefined);
  const status = useAudioPlayerStatus(player);
  const [isPlaying, setIsPlaying] = useState(false);
  const finishedRef = useRef(false);

  // Stop when the audio reaches the end.
  useEffect(() => {
    if (status.didJustFinish) {
      finishedRef.current = true;
      setIsPlaying(false);
    }
  }, [status.didJustFinish]);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      if (finishedRef.current) {
        finishedRef.current = false;
        try {
          await player.seekTo(0);
        } catch {
          // ignore — attempt to play anyway
        }
      }
      player.play();
      setIsPlaying(true);
    }
  }, [player, isPlaying]);

  const stop = useCallback(() => {
    player.pause();
    setIsPlaying(false);
    finishedRef.current = false;
  }, [player]);

  return { isPlaying, currentTime: status.currentTime, toggle, stop };
}
