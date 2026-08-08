import { getBibleDatabase } from "./bibleDatabase";
import type { BibleBook, BibleReference, BibleSearchResult, BibleVerse, CrossReference } from "./bibleTypes";

// ── Diacritic folding (mirrors build script & HighlightedText) ─

function foldDiacritics(text: string): string {
  // NFD decompose → strip combining marks
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function foldQuery(q: string): string {
  return foldDiacritics(q).toLowerCase().trim();
}

// ── Book cache ─────────────────────────────────────────────────

let _booksCache: BibleBook[] | null = null;

export async function fetchBibleBooks(): Promise<BibleBook[]> {
  if (_booksCache) return _booksCache;

  const db = await getBibleDatabase();
  const rows = await db.getAllAsync<BibleBook>(
    "SELECT id, usfm, number, name, short_name AS shortName, english_name AS englishName, testament, chapters FROM books ORDER BY id",
  );

  _booksCache = rows;

  return _booksCache;
}

// ── Book detail ────────────────────────────────────────────────

export async function fetchBibleBook(bookId: number): Promise<BibleBook | null> {
  const books = await fetchBibleBooks();
  return books.find((b) => b.id === bookId) ?? null;
}

export async function fetchBibleChapterCount(bookId: number): Promise<number> {
  const book = await fetchBibleBook(bookId);
  return book?.chapters ?? 0;
}

// ── Verses ─────────────────────────────────────────────────────

export async function fetchBibleChapter(
  bookId: number,
  chapter: number,
): Promise<BibleVerse[]> {
  const db = await getBibleDatabase();
  return db.getAllAsync<BibleVerse>(
    "SELECT book_id AS bookId, chapter, verse, text FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse",
    [bookId, chapter],
  );
}

export async function fetchBibleVerse(
  bookId: number,
  chapter: number,
  verse: number,
): Promise<BibleVerse | null> {
  const db = await getBibleDatabase();
  return db.getFirstAsync<BibleVerse>(
    "SELECT book_id AS bookId, chapter, verse, text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ?",
    [bookId, chapter, verse],
  );
}

// ── Reference resolution ──────────────────────────────────────

export async function resolveBibleReference(
  query: string,
): Promise<BibleReference | null> {
  const books = await fetchBibleBooks();
  const folded = foldQuery(query);

  // Try each book name as prefix (longest first)
  for (const book of books) {
    for (const nameVariant of [
      foldQuery(book.name),
      foldQuery(book.englishName),
      foldQuery(book.usfm),
      foldQuery(book.shortName),
    ]) {
      if (!folded.startsWith(nameVariant)) continue;
      const remainder = folded.slice(nameVariant.length).trim();

      // Parse chapter:verse
      const cvMatch = remainder.match(/^(\d+)\s*:\s*(\d+)$/);
      if (cvMatch) {
        const chapter = parseInt(cvMatch[1], 10);
        const verse = parseInt(cvMatch[2], 10);
        if (chapter >= 1 && chapter <= book.chapters && verse >= 1) {
          return {
            bookId: book.id,
            bookName: book.name,
            shortName: book.shortName,
            usfm: book.usfm,
            chapter,
            verse,
          };
        }
      }

      // Parse chapter only
      const cMatch = remainder.match(/^(\d+)$/);
      if (cMatch) {
        const chapter = parseInt(cMatch[1], 10);
        if (chapter >= 1 && chapter <= book.chapters) {
          return {
            bookId: book.id,
            bookName: book.name,
            shortName: book.shortName,
            usfm: book.usfm,
            chapter,
          };
        }
      }
    }
  }

  return null;
}

// ── Search ─────────────────────────────────────────────────────

export async function searchBibleBooks(
  query: string,
): Promise<BibleBook[]> {
  const books = await fetchBibleBooks();
  const folded = foldQuery(query);
  if (!folded) return [];

  return books.filter(
    (b) =>
      foldQuery(b.name).includes(folded) ||
      foldQuery(b.englishName).includes(folded) ||
      foldQuery(b.shortName).includes(folded) ||
      b.usfm.toLowerCase().includes(folded),
  );
}

export async function searchBibleVerses(
  query: string,
  limit = 50,
): Promise<BibleSearchResult[]> {
  const db = await getBibleDatabase();
  const sanitized = query.replace(/['"*^()]/g, "").trim();
  if (!sanitized) return [];

  const terms = sanitized.split(/\s+/).filter(Boolean);
  const ftsTerms = terms.map((t) => `"${t}"*`).join(" OR ");

  const rows = await db.getAllAsync<any>(
    `SELECT f.rowid, v.book_id AS bookId, v.chapter, v.verse,
            v.text AS verseText, b.name AS bookName,
            b.short_name AS shortName, b.usfm, rank
     FROM verses_fts f
     JOIN verses v ON v.id = f.rowid
     JOIN books b ON b.id = v.book_id
     WHERE verses_fts MATCH '${ftsTerms.replace(/'/g, "''")}'
     ORDER BY rank
     LIMIT ${limit}`,
  );

  return rows.map((r: any) => ({
    ...r,
    bookId: Number(r.bookId),
  }));
}

// ── Cross-references ──────────────────────────────────────────

export async function fetchCrossReferences(
  bookId: number,
  chapter: number,
  verse?: number,
): Promise<(CrossReference & { sourceVerse: number })[]> {
  const db = await getBibleDatabase();
  const where = verse != null
    ? "cr.book_id = ? AND cr.chapter = ? AND cr.verse = ?"
    : "cr.book_id = ? AND cr.chapter = ?";
  const params = verse != null ? [bookId, chapter, verse] : [bookId, chapter];
  const rows = await db.getAllAsync<any>(
    `SELECT cr.verse AS sourceVerse, cr.ref_book_id AS bookId, b.name AS bookName,
            b.short_name AS shortName, cr.ref_chapter AS chapter,
            cr.ref_verse AS verseStart, cr.ref_end_verse AS verseEnd, cr.votes AS rank
     FROM cross_references cr
     JOIN books b ON b.id = cr.ref_book_id
     WHERE ${where}
     ORDER BY cr.votes DESC
     LIMIT 15`,
    params,
  );
  return rows.map((r: any) => ({ ...r, bookId: Number(r.bookId), sourceVerse: Number(r.sourceVerse) }));
}
