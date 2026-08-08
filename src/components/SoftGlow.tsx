import { LinearGradient } from "expo-linear-gradient";
import { Animated, View } from "react-native";
import { useIsDark } from "@/hooks/useIsDark";

export function TopGlow({ height, opacity }: { height: number; opacity?: Animated.AnimatedInterpolation<number> }) {
  const isDark = useIsDark();

  return (
    <Animated.View className="absolute left-0 right-0 top-0" style={{ height, opacity: opacity ?? 1 }} pointerEvents="none">
      <LinearGradient
        colors={isDark ? ["rgba(15,23,42,0.92)", "rgba(15,23,42,0.85)", "rgba(15,23,42,0.4)", "rgba(15,23,42,0.06)", "transparent"] : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.82)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0.05)", "transparent"]}
        locations={[0, 0.35, 0.6, 0.82, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="flex-1"
      />
    </Animated.View>
  );
}

export function BottomGlow() {
  const isDark = useIsDark();

  return (
    <View className="absolute left-0 right-0 bottom-0 h-32" pointerEvents="none">
      <LinearGradient
        colors={isDark ? ["rgba(15,23,42,0.92)", "rgba(15,23,42,0.55)", "rgba(15,23,42,0.06)", "transparent"] : ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.06)", "transparent"]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        className="flex-1"
      />
    </View>
  );
}
