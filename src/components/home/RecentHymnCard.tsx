import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { PressableScale } from "@/components/common/PressableScale";
import { theme } from "@/theme/colors";

interface RecentHymnCardProps {
  title: string;
  bookName: string;
  number: number;
  onPress: () => void;
}

export function RecentHymnCard({ title, bookName, number, onPress }: RecentHymnCardProps) {
  return (
    <PressableScale className="flex-row items-center p-3.5 rounded-xl bg-surface gap-3" onPress={onPress}>
      <Ionicons name="time-outline" size={18} color={theme.textMuted} />
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-text-primary" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[13px] text-text-muted mt-0.5">
          {bookName} · #{number}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </PressableScale>
  );
}
