import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BookId } from "@/data/types";
import { useSettingsStore } from "@/state/settingsStore";
import { theme } from "@/theme/colors";

const SEARCH_BOOKS: { id: BookId; name: string; count: number }[] = [
  { id: "roho-mutheru", name: "Nyimbo Cia Roho Mutheru", count: 555 },
  { id: "atumwo", name: "Nyimbo Cia Atumwo", count: 218 },
  { id: "kiroho", name: "Nyimbo Cia Kiroho", count: 464 },
  { id: "golden-bells", name: "Golden Bells", count: 771 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const readingFont = useSettingsStore((s) => s.readingFont);
  const setReadingFont = useSettingsStore((s) => s.setReadingFont);
  const searchBooks = useSettingsStore((s) => s.searchBooks);
  const toggleSearchBook = useSettingsStore((s) => s.toggleSearchBook);

  return (
    <View className="flex-1 bg-white dark:bg-slate-950" style={{}}>
      <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-[32px] font-extrabold tracking-tight text-text-primary dark:text-gray-100">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <Text className="text-sm font-semibold text-text-primary dark:text-gray-100 mb-3 ml-1">Appearance</Text>
        <View className="flex-row gap-2 mb-8">
          {(["system", "light", "dark"] as const).map((mode) => {
            const active = themeMode === mode;
            return (
              <Pressable key={mode} className={`flex-1 py-2.5 rounded-xl border items-center ${active ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "border-gray-200 dark:border-slate-700"}`} onPress={() => setThemeMode(mode)}>
                <Text className={`text-[14px] font-semibold capitalize ${active ? "text-primary" : "text-text-secondary dark:text-gray-400"}`}>{mode}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reading */}
        <Text className="text-sm font-semibold text-text-primary dark:text-gray-100 mb-3 ml-1">Reading</Text>
        <View className="rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-4 py-1 mb-8">
          {/* Font family */}
          <View className="flex-row items-center justify-between py-2.5 border-b border-gray-100/60 dark:border-slate-800/60">
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary dark:text-gray-100">Serif font</Text>
              <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">Literata typeface for reading</Text>
            </View>
            <Switch value={readingFont === "serif"} onValueChange={(v) => setReadingFont(v ? "serif" : "sans")} trackColor={{ false: theme.border, true: theme.primaryLight }} thumbColor={readingFont === "serif" ? theme.primary : theme.textMuted} />
          </View>
        </View>

        {/* Search scope */}
        <Text className="text-sm font-semibold text-text-primary dark:text-gray-100 mb-3 ml-1">Search scope</Text>
        <View className="rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-4 py-1 mb-8">
          {SEARCH_BOOKS.map((book) => (
            <View key={book.id} className="flex-row items-center justify-between py-2.5 border-b border-gray-100/60 dark:border-slate-800/60 last:border-b-0">
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-text-primary dark:text-gray-100">{book.name}</Text>
                <Text className="text-[12px] text-text-muted dark:text-gray-500 mt-0.5">{book.count} hymns</Text>
              </View>
              <Switch
                // Switch component to toggle search scope for each book
                value={searchBooks.includes(book.id)}
                onValueChange={() => toggleSearchBook(book.id)}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={searchBooks.includes(book.id) ? theme.primary : theme.textMuted}
              />
            </View>
          ))}
        </View>

        {/* About */}
        <Text className="text-[13px] text-text-muted dark:text-gray-500 text-center">2,008 hymns across 4 books</Text>
      </ScrollView>
    </View>
  );
}
