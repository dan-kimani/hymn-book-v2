import { useSettingsStore } from "@/state/settingsStore";

export function useFontScale() {
  const fontSize = useSettingsStore((s) => s.fontSize ?? 18);

  return {
    /** Raw font size from settings (default 18) — for reading text */
    fontSize,
    /** Hero page titles — fontSize + 14 (default 32) */
    hero: fontSize + 14,
    /** Large headings — fontSize - 1 (default 17) */
    heading: Math.max(11, fontSize - 1),
    /** Chapter numbers, large body — fontSize - 2 (default 16) */
    bodyLarge: Math.max(10, fontSize - 2),
    /** Primary body text — fontSize - 3 (default 15) */
    body: Math.max(10, fontSize - 3),
    /** Secondary body, section headers — fontSize - 4 (default 14) */
    bodySmall: Math.max(10, fontSize - 4),
    /** Captions — fontSize - 5 (default 13) */
    caption: Math.max(10, fontSize - 5),
    /** Small captions, labels — fontSize - 6 (default 12) */
    captionSmall: Math.max(10, fontSize - 6),
    /** Verse number in chapter reader — fontSize - 5, min 10 */
    verseNumber: Math.max(10, fontSize - 5),
  } as const;
}
