import { useCallback, useState } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ onPressIn, onPressOut, style, children, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed ? 0.97 : 1, { stiffness: 400, damping: 25 }) }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      setPressed(true);
      onPressIn?.(e);
    },
    [onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [onPressOut],
  );

  return (
    <AnimatedPressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={[animStyle, style as any]} {...props}>
      {children}
    </AnimatedPressable>
  );
}
