import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useCallback, useMemo } from "react";
import { Text } from "@/components/common/Text";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFontScale } from "@/hooks/useFontScale";
import { useIsDark } from "@/hooks/useIsDark";
import { theme } from "@/theme/colors";

interface SummarySheetProps {
  visible: boolean;
  bookName: string;
  isOT: boolean;
  context: string;
  summary: string;
  aftermath: string;
  onClose: () => void;
}

export function SummarySheet({ visible, bookName, isOT, context, summary, aftermath, onClose }: SummarySheetProps) {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { body, caption, captionSmall } = useFontScale();
  const snapPoints = useMemo(() => ["65%"], []);

  const sections = [
    { label: "Historical Context", text: context, icon: "time-outline" as const },
    { label: "Theological Summary", text: summary, icon: "book-outline" as const },
    { label: "What Followed", text: aftermath, icon: "compass-outline" as const },
  ];

  const handleChange = useCallback((idx: number) => {
    if (idx === -1) onClose();
  }, [onClose]);

  return (
    <BottomSheet
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleChange}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} onPress={onClose} />
      )}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#475569" : "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: isDark ? "#0f172a" : "#fff" }}
      topInset={insets.top + 12}
    >
      <BottomSheetFlatList
        data={sections}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-4">
            <View className="flex-row items-center gap-2.5 mb-1">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isOT ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
                <Ionicons name="sparkles" size={16} color={isOT ? "#B45309" : "#2563EB"} />
              </View>
              <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
                About {bookName}
              </Text>
            </View>
            <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: captionSmall }}>
              Tap a section to read more
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons name={item.icon} size={14} color={isOT ? "#B45309" : "#2563EB"} />
              <Text className="font-semibold text-text-secondary dark:text-gray-400" style={{ fontSize: caption }}>
                {item.label}
              </Text>
            </View>
            <Text className="text-text-primary dark:text-gray-100 leading-relaxed" style={{ fontSize: body }}>
              {item.text}
            </Text>
          </View>
        )}
      />
    </BottomSheet>
  );
}
