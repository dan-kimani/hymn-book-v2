import { useMemo } from "react";
import { PanResponder } from "react-native";

export function useHorizontalSwipeNav({
  current,
  max,
  onPrev,
  onNext,
}: {
  current: number;
  max: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) =>
          Math.abs(gs.dx) > 25 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
        onPanResponderRelease: (_, gs) => {
          if (gs.dx > 60 && current > 1) onPrev();
          else if (gs.dx < -60 && current < max) onNext();
        },
      }),
    [current, max, onPrev, onNext],
  );
}
