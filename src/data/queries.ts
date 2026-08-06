import { getDatabase } from "./database";
import type { Book, Hymn, StanzaResult } from "./types";

export async function fetchBooks(): Promise<Book[]> {
  const db = await getDatabase();
  return db.getAllAsync<Book>("SELECT * FROM books ORDER BY id");
}

export async function fetchHymnMeta(bookId: string): Promise<Array<{ id: string; number: number; title: string; snippet: string }>> {
  const db = await getDatabase();
  // json_extract the first stanza lines so we can show title + continuation
  const rows = await db.getAllAsync<any>(
    `SELECT id, number, title,
            json_extract(verses_json, '$[0].stanzas[0]') as stanzaLines
     FROM hymns WHERE book_id = ? ORDER BY number`,
    [bookId],
  );
  return rows.map((row: any) => {
    let snippet = "";
    try {
      const lines: string[] = JSON.parse(row.stanzaLines ?? "[]");
      // Drop the first line (it IS the title) and join the rest
      snippet = lines.slice(1).join(" ");
    } catch {}
    return { id: row.id, number: row.number, title: row.title, snippet };
  });
}

export async function fetchHymn(hymnId: string): Promise<Hymn | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT id, book_id as bookId, number, title, "first_line" as firstLine, verses_json FROM hymns WHERE id = ?', [hymnId]);
  if (!row) return null;
  return {
    ...row,
    verses: JSON.parse(row.verses_json),
  };
}

export async function searchStanzas(query: string, bookIds: string[] | null = null, limit: number = 50): Promise<StanzaResult[]> {
  const db = await getDatabase();

  // Sanitize FTS query: escape special chars, add prefix for partial match
  const sanitized = query.replace(/['"*^()]/g, "").trim();
  if (!sanitized) return [];

  // Use prefix matching for partial-word search (e.g., "utuk" matches "ũtukũ")
  const terms = sanitized.split(/\s+/).filter(Boolean);
  const ftsQuery = terms.map((t) => `"${t}"*`).join(" AND ");

  let bookFilter = "";
  let bookParams: string[] = [];
  if (bookIds && bookIds.length > 0) {
    bookFilter = `AND s.book_id IN (${bookIds.map(() => "?").join(",")})`;
    bookParams = bookIds;
  }

  // Subquery: get the best (min rank) stanza per hymn, then deduplicate by hymnId
  const sql = `
    SELECT hymnId, bookId, bookName, hymnNumber, hymnTitle,
           verseNumber, stanzaIndex, stanzaText, minRank as rank
    FROM (
      SELECT s.hymn_id as hymnId, s.book_id as bookId, s.book_name as bookName,
             s.hymn_number as hymnNumber, s.hymn_title as hymnTitle,
             s.verse_number as verseNumber, s.stanza_index as stanzaIndex,
             s.stanza_text as stanzaText,
             MIN(rank) as minRank
      FROM stanzas_fts f
      JOIN stanzas_content s ON f.rowid = s.rowid
      WHERE stanzas_fts MATCH ? ${bookFilter}
      GROUP BY s.hymn_id
      ORDER BY minRank
      LIMIT ?
    )
  `;

  return db.getAllAsync<StanzaResult>(sql, [ftsQuery, ...bookParams, limit]);
}

export async function fetchDailyHymn(): Promise<{
  id: string;
  bookId: string;
  bookName: string;
  number: number;
  title: string;
  snippet: string;
} | null> {
  const db = await getDatabase();
  // Deterministic "random" based on today's date
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  const total = (await db.getFirstAsync<{ cnt: number }>("SELECT COUNT(*) as cnt FROM hymns WHERE book_id != 'golden-bells'"))?.cnt ?? 1;
  const offset = Math.abs(hash) % total;

  const row = await db.getFirstAsync<any>(
    `SELECT h.id, h.book_id as bookId, b.name as bookName, h.number, h.title,
            json_extract(h.verses_json, '$[0].stanzas[0]') as stanzaLines
     FROM hymns h JOIN books b ON h.book_id = b.id
     WHERE h.book_id != 'golden-bells'
     LIMIT 1 OFFSET ?`,
    [offset],
  );
  if (!row) return null;

  let snippet = "";
  try {
    const lines: string[] = JSON.parse(row.stanzaLines ?? "[]");
    snippet = lines.slice(1).join(" ");
  } catch {}

  return {
    id: row.id,
    bookId: row.bookId,
    bookName: row.bookName,
    number: row.number,
    title: row.title,
    snippet,
  };
}

export async function searchByNumber(number: number, bookIds: string[] | null = null): Promise<Array<{ id: string; bookId: string; bookName: string; number: number; title: string; firstLine: string }>> {
  const db = await getDatabase();

  if (bookIds && bookIds.length > 0) {
    const placeholders = bookIds.map(() => "?").join(",");
    const rows = await db.getAllAsync<any>(
      `SELECT h.id, h.book_id as bookId, b.name as bookName, h.number, h.title, h.first_line as firstLine
       FROM hymns h JOIN books b ON h.book_id = b.id
       WHERE h.number = ? AND h.book_id IN (${placeholders})
       ORDER BY h.book_id`,
      [number, ...bookIds],
    );
    return rows;
  } else {
    const rows = await db.getAllAsync<any>(
      `SELECT h.id, h.book_id as bookId, b.name as bookName, h.number, h.title, h.first_line as firstLine
       FROM hymns h JOIN books b ON h.book_id = b.id
       WHERE h.number = ?
       ORDER BY h.book_id`,
      [number],
    );
    return rows;
  }
}
