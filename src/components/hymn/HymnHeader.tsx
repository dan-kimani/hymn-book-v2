import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { theme } from "@/theme/colors";

interface HymnHeaderProps {
  bookName: string;
  number: string;
  accentColor?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function HymnHeader({ bookName, number, accentColor = "text-primary", isFavorite, onToggleFavorite }: HymnHeaderProps) {
  return (
    <View className="flex-row items-start pt-14 px-4 pb-3.5 border-b-hairline border-border-light gap-3">
      <Pressable onPress={() => router.back()} hitSlop={8} className="pt-0.5">
        <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
      </Pressable>
      <View className="flex-1">
        <Text className={`text-sm font-bold uppercase tracking-wide ${accentColor}`}>{bookName}</Text>
        <Text className="text-[13px] text-text-secondary mt-0.5">Hymn #{number}</Text>
      </View>
      <Pressable onPress={onToggleFavorite} hitSlop={8} className="pt-0.5">
        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? theme.favorite : theme.textMuted} />
      </Pressable>
    </View>
  );
}
