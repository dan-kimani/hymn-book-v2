import { Ionicons } from "@expo/vector-icons";
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
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const searchBooks = useSettingsStore((s) => s.searchBooks);
  const toggleSearchBook = useSettingsStore((s) => s.toggleSearchBook);

  const ThemeBtn = ({ mode, label, icon }: { mode: "system" | "light" | "dark"; label: string; icon: string }) => {
    const active = themeMode === mode;
    return (
      <Pressable className={`flex-1 items-center justify-center py-3 rounded-lg border gap-1 ${active ? "border-primary/30 bg-primary/5 dark:bg-primary/10" : "border-gray-200 dark:border-slate-700"}`} onPress={() => setThemeMode(mode)}>
        <Ionicons name={icon as any} size={20} color={active ? theme.primary : theme.textMuted} />
        <Text className={`text-[13px] font-semibold ${active ? "text-primary" : "text-text-secondary dark:text-gray-400"}`}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 pb-2" style={{ paddingTop: insets.top + 12 }}>
        <Text className="text-[32px] font-extrabold tracking-tight text-text-primary dark:text-gray-100">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <Text className="text-xs font-bold tracking-[1px] text-text-secondary dark:text-gray-400 ml-1 mb-2 mt-2">APPEARANCE</Text>
        <View className="rounded-xl p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <Text className="text-base font-medium text-text-primary dark:text-gray-100">Theme</Text>
          <View className="flex-row gap-2 mt-3">
            <ThemeBtn mode="system" label="System" icon="phone-portrait-outline" />
            <ThemeBtn mode="light" label="Light" icon="sunny-outline" />
            <ThemeBtn mode="dark" label="Dark" icon="moon-outline" />
          </View>
        </View>

        {/* Reading */}
        <Text className="text-xs font-bold tracking-[1px] text-text-secondary dark:text-gray-400 ml-1 mb-2 mt-6">READING</Text>
        <View className="rounded-xl p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-base font-medium text-text-primary dark:text-gray-100">Font Size</Text>
            <View className="flex-row items-center gap-3">
              <Pressable className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800" onPress={() => setFontSize(fontSize - 1)}>
                <Text className="text-sm font-semibold text-text-primary dark:text-gray-100">A−</Text>
              </Pressable>
              <Text className="text-base font-bold text-text-primary dark:text-gray-100 w-10 text-center">{fontSize}px</Text>
              <Pressable className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800" onPress={() => setFontSize(fontSize + 1)}>
                <Text className="text-sm font-semibold text-text-primary dark:text-gray-100">A+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Search Scope */}
        <Text className="text-xs font-bold tracking-[1px] text-text-secondary dark:text-gray-400 ml-1 mb-2 mt-6">SEARCH SCOPE</Text>
        <View className="rounded-xl p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <Text className="text-[13px] leading-4.5 text-text-muted dark:text-gray-500 mb-2">Limit search to specific books. When none selected, all books are searched.</Text>
          {SEARCH_BOOKS.map((book) => (
            <View key={book.id} className="flex-row items-center justify-between py-1.5">
              <View className="flex-1">
                <Text className="text-base font-medium text-text-primary dark:text-gray-100">{book.name}</Text>
                <Text className="text-sm text-text-muted dark:text-gray-500 mt-0.5">{book.count} hymns</Text>
              </View>
              <Switch value={searchBooks.includes(book.id)} onValueChange={() => toggleSearchBook(book.id)} trackColor={{ false: theme.border, true: theme.primaryLight }} thumbColor={searchBooks.includes(book.id) ? theme.primary : theme.textMuted} />
            </View>
          ))}
        </View>

        {/* About */}
        <Text className="text-xs font-bold tracking-[1px] text-text-secondary dark:text-gray-400 ml-1 mb-2 mt-6">ABOUT</Text>
        <View className="rounded-xl p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-base font-medium text-text-primary dark:text-gray-100">Version</Text>
            <Text className="text-sm text-text-muted dark:text-gray-500">1.0.0</Text>
          </View>
          <View className="h-px bg-gray-100 dark:bg-slate-800 my-2.5" />
          <View className="flex-row items-center justify-between py-1.5">
            <Text className="text-base font-medium text-text-primary dark:text-gray-100">Hymns</Text>
            <Text className="text-sm text-text-muted dark:text-gray-500">2,008 across 4 books</Text>
          </View>
        </View>

        <View className="h-32" />
      </ScrollView>
    </View>
  );
}
