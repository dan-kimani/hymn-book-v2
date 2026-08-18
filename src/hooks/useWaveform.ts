import { useEffect, useState } from "react";
import { decodeAudioData } from "react-native-audio-api";

const BUCKETS = 60;

/** Decode an audio file into normalized (0..1) amplitude peaks, one per waveform bar. */
export function useWaveform(uri: string | null | undefined): number[] {
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setPeaks([]);
      return;
    }
    setPeaks([]);
    (async () => {
      try {
        const buffer = await decodeAudioData(uri);
        if (cancelled) return;
        const data = buffer.getChannelData(0);
        const bucketSize = Math.max(1, Math.floor(data.length / BUCKETS));
        const buckets: number[] = [];
        let maxPeak = 0;
        for (let i = 0; i < BUCKETS; i++) {
          let max = 0;
          const start = i * bucketSize;
          const end = Math.min((i + 1) * bucketSize, data.length);
          for (let j = start; j < end; j++) {
            const a = Math.abs(data[j]);
            if (a > max) max = a;
          }
          buckets.push(max);
          if (max > maxPeak) maxPeak = max;
        }
        if (cancelled) return;
        setPeaks(maxPeak > 0 ? buckets.map((p) => p / maxPeak) : buckets);
      } catch {
        if (!cancelled) setPeaks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return peaks;
}
