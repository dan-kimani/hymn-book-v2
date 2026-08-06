export type BookId = "roho-mutheru" | "atumwo" | "kiroho" | "golden-bells";

export interface Book {
  id: BookId;
  name: string;
  language: "ki" | "en";
  count: number;
  color: string;
}

export interface HymnVerse {
  number: number;
  stanzas: string[][];
}

export interface Hymn {
  id: string; // "roho-mutheru:42"
  bookId: BookId;
  number: number;
  title: string;
  firstLine: string;
  verses: HymnVerse[];
}

export interface StanzaResult {
  hymnId: string;
  bookId: string;
  bookName: string;
  hymnNumber: number;
  hymnTitle: string;
  verseNumber: number;
  stanzaIndex: number;
  stanzaText: string;
  rank: number;
}

export interface RecentItem {
  hymnId: string;
  bookId: string;
  bookName: string;
  number: number;
  title: string;
  openedAt: number; // timestamp
}
