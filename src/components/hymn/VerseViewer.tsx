import { Text, View } from "react-native";

import type { HymnVerse } from "@/data/types";

interface VerseViewerProps {
  verses: HymnVerse[];
  fontSize?: number;
  accentColor?: string;
}

export function VerseViewer({ verses, fontSize = 18, accentColor = "text-text-primary" }: VerseViewerProps) {
  const lineHeight = fontSize * 1.7;
  const verseGap = fontSize * 1.3;
  const stanzaGap = fontSize * 0.7;

  return (
    <View style={{ gap: verseGap }}>
      {verses.map((verse, vi) => (
        <View key={vi}>
          {verse.stanzas.map((stanza, si) => (
            <View key={si} style={{ marginBottom: si < verse.stanzas.length - 1 ? stanzaGap : 0 }}>
              {stanza.map((line, li) => (
                <Text key={li} className={`text-text-primary font-normal ${accentColor}`} style={{ fontSize, lineHeight }}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
