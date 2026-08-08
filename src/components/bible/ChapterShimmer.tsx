import { ScrollView, View } from "react-native";
import { ShimmerBar } from "@/components/common/ShimmerBar";

export function ChapterShimmer({ paddingTop = 80 }: { paddingTop?: number }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop, paddingHorizontal: 20, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* Chapter title */}
      <View className="mb-6 mt-2">
        <View className="h-3.5 w-28 rounded-md bg-gray-100 dark:bg-slate-800 mb-2 overflow-hidden">
          <ShimmerBar />
        </View>
        <View className="h-6 w-40 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <ShimmerBar />
        </View>
      </View>

      {/* Verse paragraph shimmers — inline number + flowing text */}
      {[1, 2, 3, 4].map((v) => (
        <View key={v} className="mb-4 px-5">
          <View className="flex-row gap-2">
            <View className="h-3.5 w-5 rounded-sm bg-gray-100 dark:bg-slate-800 overflow-hidden mt-0.5">
              <ShimmerBar />
            </View>
            <View className="flex-1 gap-2">
              <View className="h-4 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden" style={{ width: "100%" }}>
                <ShimmerBar />
              </View>
              <View className="h-4 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden" style={{ width: "92%" }}>
                <ShimmerBar />
              </View>
              <View className="h-4 rounded-lg bg-gray-100 dark:bg-slate-800 overflow-hidden" style={{ width: "65%" }}>
                <ShimmerBar />
              </View>
              {v % 2 === 0 && (
                <View className="flex-row gap-2 mt-1">
                  <View className="h-3 w-16 rounded-md bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <ShimmerBar />
                  </View>
                  <View className="h-3 w-14 rounded-md bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <ShimmerBar />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
