export type Testament = "OT" | "NT";

export interface BibleBook {
  id: number; // canonical order 1-66
  usfm: string; // "GEN", "EXO", "1KI"
  number: number; // canonical order 1-66
  name: string; // Gikuyu: "Kĩambĩrĩria"
  shortName: string; // abbreviated
  englishName: string; // "Genesis", for search aliases
  testament: Testament;
  chapters: number; // total chapters in this book
}

export interface BibleVerse {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleSearchResult {
  rowid: number;
  bookId: number;
  bookName: string;
  shortName: string;
  usfm: string;
  chapter: number;
  verse: number;
  verseText: string;
  rank: number;
}

export interface BibleReference {
  bookId: number;
  bookName: string;
  shortName: string;
  usfm: string;
  chapter: number;
  verse?: number;
}

export interface CrossReference {
  bookId: number;
  bookName: string;
  shortName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  rank: number;
}

export interface BibleBookmark {
  id: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  note: string;
  createdAt: string;
}
