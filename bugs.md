# Bugs

Consolidated bug audit for Nyĩmbo na Kĩrĩkanĩro, organized by impact.

---

## 🔴 High impact (data loss / broken core features)

### 1. Second recording session fails ✅ RESOLVED

- **File:** `src/hooks/useRecorder.ts:40-44`
- `prepareToRecordAsync` is gated behind `firstRecord.current`, so it runs only on the first recording. After `stop()`, the recorder is never re-prepared, so a second `record()` throws or no-ops.
- **Failure:** Record a hymn, stop, then tap mic again → "Could not start recording" or no file saved. Recording works exactly once.

### 2. Recording saved under the wrong hymn ✅ RESOLVED

- **Files:** `src/hooks/useRecorder.ts:57-93`, `app/hymn/[bookId]/[number].tsx:92,105`
- `useRecorder(hymnId)` does not reset when `hymnId` changes (the screen stays mounted across `setParams`). `stop()` closes over the _current_ `hymnId`, and `handleMicPress` uses the render-scope `hymnId`.
- **Failure:** Start recording on hymn 42, swipe to 43, press stop → recording stored under hymn 43 with duration including navigation time; hymn 42 shows no recording.

### 3. Playback never stops on delete or navigation ✅ RESOLVED

- **Files:** `app/hymn/[bookId]/[number].tsx:131-135,185-190`, `src/hooks/useRecorder.ts:127-140`
- `handleDeleteRecording` only nulls `playingId`/`playingPath`; `goToHymn` doesn't touch playback. The auto-play effect returns early on null without pausing the underlying `useAudioPlayer`, which persists because the component never unmounts.
- **Failure:** Play a recording, then tap trash or swipe to the next hymn → audio keeps playing with no visible control; the only way to stop it is to play a different file.

### 4. Playback progress overflows past 100% ✅ RESOLVED

- **File:** `src/hooks/useRecorder.ts:143-153`
- The 500ms interval tracks `isPlaying` locally; nothing subscribes to the player's completion event, so it keeps counting after audio finishes.
- **Failure:** Play a 30s recording → at 0:30 the bar exceeds 100% width and the label shows e.g. 0:45/0:30 indefinitely.

### 5. Deleting one bookmark deletes overlapping bookmarks ✅ RESOLVED

- **File:** `src/state/bibleBookmarksStore.ts:30-34`
- `removeBookmark` filters by `verseStart <= verse && verseEnd >= verse`, matching every bookmark whose range contains the tapped verse rather than the exact bookmark.
- **Failure:** Bookmark 1-5, then 3-8. Tapping remove on 3-8 also deletes 1-5 (because 1≤3≤5). Silent data loss.

### 6. Verse selection not cleared on chapter navigation ✅ RESOLVED

- **File:** `app/bible/[bookId]/[chapter].tsx:203-210`
- `goToChapter` scrolls and calls `router.setParams` but never calls `clearSelection()`.
- **Failure:** Select verses 5-8 in chapter 5, tap "Chapter 6" → chapter 6 renders with stale selection styling, and Copy/Bookmark records chapter 6:5-8 — verses never selected.

---

## 🟠 Medium impact (visible wrong behavior)

### 7. Home greeting header stuck hidden after clearing search ✅ RESOLVED

- **File:** `app/(tabs)/index.tsx:55-99,139`
- `scrolledPastRef`/`atTopAnim`/`scrollY` persist across the `active ? FlatList : ScrollView` switch. Clearing a search remounts the ScrollView at offset 0, but the refs keep the scrolled state, and no scroll event fires on remount to call `syncAtTop()`.
- **Failure:** Scroll down (header hides) → search → clear → greeting header stays invisible until a manual scroll.

### 8. Stale search results during a new search ✅ RESOLVED

- **File:** `src/state/hymnSearchStore.ts:23-44`, `app/(tabs)/index.tsx:139`
- `setQuery` sets `searching: true` but does not clear previous `results`, so old rows render against the new query while the new search is in flight.
- **Failure:** Search "Jesus" → backspace to "Jesu" → old "Jesus" rows stay visible, highlighted against "Jesu".

### 9. Bible tab: stale results + loading bar never re-shows ✅ RESOLVED

- **File:** `src/state/bibleStore.ts:82-102`, `app/(tabs)/bible.tsx:52-56`
- `setQuery` doesn't clear `bookResults`/`verseResults`; `showSearching` requires `!hasResults`, which is never true on a second search.
- **Failure:** Search "Johana" → edit to "Johana 3" → old results stay and the loading bar never appears.

### 10. JumpSheet search race (no staleness guard) ✅ RESOLVED

- **File:** `src/components/search/JumpSheet.tsx:61-87`
- The debounced effect only clears the timer; the in-flight `searchStanzas` promise isn't cancelled or staleness-checked (unlike the home store's `get().query.trim() === trimmed` guard).
- **Failure:** Type "mũ" then "mũci" — if the first request resolves last, it overwrites the second's results and taps navigate to a hymn unrelated to the visible query.

### 11. Search error clears `searching` for a superseded request ✅ RESOLVED

- **Files:** `src/state/hymnSearchStore.ts:40-43`, `src/state/bibleStore.ts:98-101`
- `.catch` unconditionally sets `searching: false`, even if the erroring request was superseded by a newer query still in flight.
- **Failure:** Transient error on an older search shows "No hymns found" prematurely while a newer search is still running.

### 12. Scroll-to-match hidden under the floating header ✅ RESOLVED

- **File:** `app/hymn/[bookId]/[number].tsx:179`
- `scrollTo({ y: y - 20 })` places the matched verse at screen y=20, behind the `insets.top + 68` blur header. Should be `y - headerHeight`.
- **Failure:** Tapping a search result for a far-down verse lands the stanza behind the header, invisible.

### 13. Search highlight ranges misaligned on diacritics ✅ NOT A BUG

- **File:** `src/components/search/HighlightedText.tsx:38-81`
- Ranges are computed on the folded (diacritic-stripped) string but sliced from the original, so indices don't align at diacritic boundaries.
- **Failure:** Searching "utuk" against "ũtukũ" → highlight omits the final diacritic character.
- **Verdict:** False positive. The DB stores precomposed diacritics (ũ/ĩ as single code points), so `fold()` produces same-length output and the indices align. Verified no decomposed combining marks exist in `stanzas_content`.

### 14. Bible selection bar off-screen when scrolled ✅ RESOLVED

- **Files:** `app/bible/[bookId]/[chapter].tsx:319-321`, `src/components/bible/VerseSelectionBar.tsx`
- `onLayout` stores a scroll-content coordinate, but the bar uses it as an absolute screen `top`.
- **Failure:** Long-press a verse while scrolled ~1000px → the selection bar renders far below the viewport, unreachable.

### 15. `bibleStore` leaves stale refs/book/totalChapters on load/error ✅ RESOLVED

- **File:** `src/state/bibleStore.ts:56-73`
- Only `verses` is cleared on a new chapter load. Cross-ref button shows the previous chapter's refs; on error or mid-load swipe, `totalChapters` stays stale.
- **Failure:** Navigate from a 50-chapter book to a 1-chapter book and swipe mid-load → navigates to a non-existent chapter (blank screen).

### 16. Bible tab header blur stays opaque over search results ✅ RESOLVED

- **File:** `app/(tabs)/bible.tsx:27,73-77`
- The single `scrollY` persists across the idle→results switch, so `headerOpacity` stays 1 over the results top.
- **Failure:** Scroll the book list (blur fades in) → search → results show with the blur header still fully opaque.

### 17. Time-of-day greeting never refreshes ✅ RESOLVED

- **File:** `app/(tabs)/index.tsx:52`
- `useMemo(() => getGreeting(), [])` snapshots at mount.
- **Failure:** Opened at 4:59pm, still shows the afternoon greeting at 5:30pm.

### 18. Book detail edge-swipe-back reads stale `touchStartX` ✅ RESOLVED

- **File:** `app/book/[bookId].tsx:64-87`
- `touchStartX` is read in `onMoveShouldSetPanResponder` before `onPanResponderGrant` writes it (initial value 0).
- **Failure:** The first horizontal drag anywhere on the list can trigger back-navigation.

---

## 🟡 Lower severity

### 19. Whitespace-only query shows "No hymns found" ✅ RESOLVED

- **File:** `src/state/hymnSearchStore.ts:25`, `app/(tabs)/index.tsx:139-141`
- `setQuery` stores the untrimmed query while searching on the trimmed value; a spaces-only input has `query.length > 0` with empty results.

### 20. Recording files orphaned on disk ✅ RESOLVED

- **Files:** `src/state/recordingsStore.ts:26-29`, `app/hymn/[bookId]/[number].tsx:131-135`
- `removeRecording` sets the map value to `null` instead of deleting the key, and the `.m4a` file is never deleted. Re-recording also orphans the previous file.

### 21. `useRecorder` unmount doesn't stop in-progress recording ✅ RESOLVED

- **File:** `src/hooks/useRecorder.ts:96-100`
- Cleanup clears only the timer; an active recording keeps capturing audio after unmount with no way to stop/save it.

### 22. Search highlight persists onto next hymn ✅ RESOLVED

- **File:** `app/hymn/[bookId]/[number].tsx:73-86`
- The effect has no `else` branch to reset `highlightKey`; within the ~3s fade window, prev/next navigation highlights the wrong stanza.

### 23. Book detail `getItemLayout` wrong row height ✅ RESOLVED

- **File:** `app/book/[bookId].tsx:149`
- Fixed `length: 64` vs actual ~70-75px rows → wrong virtualization offsets on fast scroll.

### 24. Cross-ref navigation can push a duplicate chapter ✅ RESOLVED

- **File:** `app/bible/[bookId]/[chapter].tsx:196-201`, `src/components/bible/CrossRefExplorer.tsx:118-129`
- A cross-reference to the current book/chapter pushes a second copy of the same screen.

### 25. `usePlayback` double-`play()` race ✅ RESOLVED

- **File:** `src/hooks/useRecorder.ts:133-140`
- Tapping play within the 300ms auto-play window triggers a second `play()` from the pending timeout.

### 26. Unparameterized SQL (book IDs interpolated) ✅ RESOLVED

- **File:** `src/data/queries.ts:48-51` (also `src/data/bibleQueries.ts:161-163`)
- `bookIds` are interpolated into the SQL `IN (...)` with no parameter binding or sanitization (IDs come from persisted `settingsStore.searchBooks`).

### 27. Collections seeding ignores hydration `error` arg ✅ RESOLVED

- **File:** `src/state/collectionsStore.ts:140-145`
- On a corrupt/unparseable store, seeding proceeds and silently drops user collections. (Confirmed: seeding runs _after_ hydration, so no overwrite race — but error handling is missing.)
