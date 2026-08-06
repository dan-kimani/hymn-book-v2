import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import { theme } from "@/theme/colors";

interface HymnListItemProps {
  number: number;
  title: string;
  firstLine: string;
  accentColor?: string;
  onPress: () => void;
}

export function HymnListItem({ number, title, firstLine, accentColor = "text-primary", onPress }: HymnListItemProps) {
  return (
    <PressableScale className="flex-row items-center px-4 py-3.5 border-b-hairline border-border-light gap-3" onPress={onPress}>
      <Text className={`text-[15px] font-bold min-w-10.5 ${accentColor}`}>#{number}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[13px] text-text-secondary mt-0.5" numberOfLines={1}>
          {firstLine}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </PressableScale>
  );
}
