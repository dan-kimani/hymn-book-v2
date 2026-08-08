import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useIsDark } from "@/hooks/useIsDark";

export function ShimmerBar() {
  const isDark = useIsDark();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] });

  return (
    <Animated.View
      className="absolute inset-0"
      style={{
        transform: [{ translateX }],
        backgroundColor: isDark ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.15)",
        width: "200%",
      }}
    />
  );
}
