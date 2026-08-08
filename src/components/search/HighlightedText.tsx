import { Text } from "@/components/common/Text";

import { theme } from "@/theme/colors";

/** Strip diacritics and lowercase for comparison — mirrors FTS5 indexing. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface Segment {
  text: string;
  match: boolean;
}

/**
 * Renders `text` with all occurrences of the `query` terms highlighted.
 * Diacritic-aware: searching "utuk" will highlight "ũtukũ" in the original text.
 */
export function HighlightedText({ text, query, className, style, numberOfLines }: { text: string; query: string; className?: string; style?: any; numberOfLines?: number }) {
  if (!query.trim()) {
    return (
      <Text className={className} style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const terms = query.trim().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return (
      <Text className={className} style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const foldedText = fold(text);
  const foldedTerms = terms.map(fold);

  // Find all match ranges (start, end) in the original text
  const ranges: Array<{ start: number; end: number }> = [];

  for (const ft of foldedTerms) {
    let pos = 0;
    while (pos < foldedText.length) {
      const idx = foldedText.indexOf(ft, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + ft.length });
      pos = idx + 1;
    }
  }

  if (ranges.length === 0) {
    return (
      <Text className={className} style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    if (merged.length > 0 && r.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  // Build segments from merged ranges
  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      segments.push({ text: text.slice(cursor, r.start), match: false });
    }
    segments.push({ text: text.slice(r.start, r.end), match: true });
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return (
    <Text className={className} style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) =>
        seg.match ? (
          <Text
            key={i}
            style={{
              color: theme.primary,
              fontWeight: "700",
              backgroundColor: theme.primary + "12",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  );
}
