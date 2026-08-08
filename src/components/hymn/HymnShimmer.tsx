import { ScrollView, View } from "react-native";
import { ShimmerBar } from "@/components/common/ShimmerBar";

interface HymnShimmerProps {
  headerHeight: number;
}

export function HymnShimmer({ headerHeight }: HymnShimmerProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerHeight + 12, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Title shimmer */}
      <View className="items-center mb-8">
        <View className="h-6 w-3/4 rounded-lg bg-gray-100 dark:bg-slate-800 mb-3 overflow-hidden">
          <ShimmerBar />
        </View>
        <View className="h-3.5 w-1/3 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <ShimmerBar />
        </View>
      </View>
      {/* Verse block shimmers */}
      {[1, 2, 3].map((v) => (
        <View key={v} className="mb-6">
          <View className="h-3.5 w-8 rounded-md bg-gray-100 dark:bg-slate-800 mb-3 overflow-hidden">
            <ShimmerBar />
          </View>
          <View className="gap-2.5">
            {[0.72, 0.95, 0.6, 0.85].slice(0, v === 1 ? 4 : 3).map((w, i) => (
              <View key={i} className="h-4 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden" style={{ width: `${w * 100}%` }}>
                <ShimmerBar />
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
