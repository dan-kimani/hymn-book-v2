import { View, type ViewProps } from "react-native";

interface ThemedViewProps extends ViewProps {
  surface?: boolean;
  alt?: boolean;
}

export function ThemedView({ surface, alt, className, ...props }: ThemedViewProps) {
  const bg = alt ? "bg-surface-alt" : surface ? "bg-surface" : "bg-transparent";
  return <View className={`${bg} ${className ?? ""}`} {...props} />;
}
