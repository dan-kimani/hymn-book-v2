#!/usr/bin/env python3
"""
Build a clean, minimal SQLite Kikuyu Bible database from pre-extracted JSON files.

Reads 66 book JSON files from extracted/nyimbopackage-mondo/bible_text/,
creates a FTS5-indexed database at assets/data/kikuyu-bible.db.

Schema:
  books      — 66 rows: id, usfm, number, name, short_name, testament
  verses     — 31,102 rows: book_id, chapter, verse, text, search_text
  verses_fts — FTS5 external-content virtual table
"""

import json
import os
import re
import sqlite3
import unicodedata

# ── Configuration ──────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE_DIR = os.path.join(BASE_DIR, "extracted", "nyimbopackage-mondo", "bible_text")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets", "data")
DB_PATH = os.path.join(OUTPUT_DIR, "kikuyu-bible.db")

# Canonical book order: USFM code → (number, english_name, short_name_override)
USFM_ORDER = [
    ("GEN",  1,  "Genesis",                   None),
    ("EXO",  2,  "Exodus",                    None),
    ("LEV",  3,  "Leviticus",                 "Alawii"),
    ("NUM",  4,  "Numbers",                   None),
    ("DEU",  5,  "Deuteronomy",               "Gũcokerithia"),
    ("JOS",  6,  "Joshua",                    None),
    ("JDG",  7,  "Judges",                    "Atiirĩrĩri Bũrũri"),
    ("RUT",  8,  "Ruth",                      None),
    ("1SA",  9,  "1 Samuel",                  None),
    ("2SA",  10, "2 Samuel",                  None),
    ("1KI",  11, "1 Kings",                   "1 Athamaki"),
    ("2KI",  12, "2 Kings",                   "2 Athamaki"),
    ("1CH",  13, "1 Chronicles",              "1 Maũndũ ma Tene"),
    ("2CH",  14, "2 Chronicles",              "2 Maũndũ ma Tene"),
    ("EZR",  15, "Ezra",                      None),
    ("NEH",  16, "Nehemiah",                  None),
    ("EST",  17, "Esther",                    None),
    ("JOB",  18, "Job",                       None),
    ("PSA",  19, "Psalms",                    "Thaburi"),
    ("PRO",  20, "Proverbs",                  "Thimo"),
    ("ECC",  21, "Ecclesiastes",              "Kohelethu"),
    ("SNG",  22, "Song of Solomon",           "Rũĩmbo rũa Suleimani"),
    ("ISA",  23, "Isaiah",                    None),
    ("JER",  24, "Jeremiah",                  None),
    ("LAM",  25, "Lamentations",              "Macakaya"),
    ("EZK",  26, "Ezekiel",                   None),
    ("DAN",  27, "Daniel",                    None),
    ("HOS",  28, "Hosea",                     None),
    ("JOL",  29, "Joel",                      None),
    ("AMO",  30, "Amos",                      None),
    ("OBA",  31, "Obadiah",                   None),
    ("JON",  32, "Jonah",                     None),
    ("MIC",  33, "Micah",                     None),
    ("NAM",  34, "Nahum",                     None),
    ("HAB",  35, "Habakkuk",                  None),
    ("ZEP",  36, "Zephaniah",                 None),
    ("HAG",  37, "Haggai",                    None),
    ("ZEC",  38, "Zechariah",                 None),
    ("MAL",  39, "Malachi",                   None),
    ("MAT",  40, "Matthew",                   None),
    ("MRK",  41, "Mark",                      None),
    ("LUK",  42, "Luke",                      None),
    ("JHN",  43, "John",                      None),
    ("ACT",  44, "Acts",                      "Atũmwo"),
    ("ROM",  45, "Romans",                    None),
    ("1CO",  46, "1 Corinthians",             "1 Akorintho"),
    ("2CO",  47, "2 Corinthians",             "2 Akorintho"),
    ("GAL",  48, "Galatians",                 None),
    ("EPH",  49, "Ephesians",                 None),
    ("PHP",  50, "Philippians",               None),
    ("COL",  51, "Colossians",                None),
    ("1TH",  52, "1 Thessalonians",           "1 Athesalonike"),
    ("2TH",  53, "2 Thessalonians",           "2 Athesalonike"),
    ("1TI",  54, "1 Timothy",                 "1 Timotheo"),
    ("2TI",  55, "2 Timothy",                 "2 Timotheo"),
    ("TIT",  56, "Titus",                     None),
    ("PHM",  57, "Philemon",                  None),
    ("HEB",  58, "Hebrews",                   "Ahibirania"),
    ("JAS",  59, "James",                     None),
    ("1PE",  60, "1 Peter",                   "1 Petero"),
    ("2PE",  61, "2 Peter",                   "2 Petero"),
    ("1JN",  62, "1 John",                    "1 Johana"),
    ("2JN",  63, "2 John",                    "2 Johana"),
    ("3JN",  64, "3 John",                    "3 Johana"),
    ("JUD",  65, "Jude",                      "Judasi"),
    ("REV",  66, "Revelation",                "Kũguũrĩrio"),
]

# ── Unicode helpers (mirrors build_data.py) ────────────────────

def fold_diacritics(text: str) -> str:
    """NFD decompose → strip combining marks.  'Mũhonokia' → 'Muhonokia'"""
    nfd = unicodedata.normalize("NFD", text)
    return "".join(c for c in nfd if not unicodedata.combining(c))

def normalize_search(text: str) -> str:
    """Fold diacritics + lowercase + collapse whitespace, for FTS indexing."""
    return re.sub(r"\s+", " ", fold_diacritics(text).lower()).strip()

# ── Build ─────────────────────────────────────────────────────

def build():
    # Remove old DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    for suffix in ("-wal", "-shm"):
        p = DB_PATH + suffix
        if os.path.exists(p):
            os.remove(p)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load book_names.json for Gikuyu name mapping
    with open(os.path.join(BIBLE_DIR, "book_names.json"), encoding="utf-8") as f:
        gikuyu_names = json.load(f)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # ── Schema ──────────────────────────────────────────────────
    conn.executescript("""
        CREATE TABLE books (
            id         INTEGER PRIMARY KEY,
            usfm       TEXT    NOT NULL,
            number     INTEGER NOT NULL,
            name       TEXT    NOT NULL,
            short_name TEXT    NOT NULL,
            english_name TEXT  NOT NULL,
            testament  TEXT    NOT NULL,
            chapters   INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE verses (
            id          INTEGER PRIMARY KEY,
            book_id     INTEGER NOT NULL REFERENCES books(id),
            chapter     INTEGER NOT NULL,
            verse       INTEGER NOT NULL,
            text        TEXT    NOT NULL
        );
        CREATE INDEX idx_verses_bcv ON verses(book_id, chapter, verse);

        CREATE TABLE cross_references (
            book_id         INTEGER NOT NULL REFERENCES books(id),
            chapter         INTEGER NOT NULL,
            verse           INTEGER NOT NULL,
            ref_book_id     INTEGER NOT NULL REFERENCES books(id),
            ref_chapter     INTEGER NOT NULL,
            ref_verse       INTEGER NOT NULL,
            ref_end_chapter INTEGER NOT NULL DEFAULT 0,
            ref_end_verse   INTEGER NOT NULL DEFAULT 0,
            votes           INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX idx_cr_src ON cross_references(book_id, chapter, verse);

        CREATE VIRTUAL TABLE verses_fts USING fts5(
            text,
            content=verses,
            content_rowid=id,
            tokenize='unicode61'
        );

        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)

    # ── Insert books ────────────────────────────────────────────
    usfm_to_num = {}
    for usfm, num, eng_name, short_override in USFM_ORDER:
        usfm_to_num[usfm] = num
        name = gikuyu_names.get(usfm, "").strip()
        short_name = short_override or name

        # Trim very long short names to first word or reasonable length
        if len(short_name) > 20:
            words = short_name.split()
            short_name = words[0] if words else short_name[:12]

        testament = "OT" if num <= 39 else "NT"

        # Count chapters from the JSON source (known before verse insertion)
        fname = os.path.join(BIBLE_DIR, f"{usfm}.json")
        chapter_count = 0
        if os.path.exists(fname):
            with open(fname, encoding="utf-8") as f:
                chapter_count = len(json.load(f))

        conn.execute(
            "INSERT INTO books (id, usfm, number, name, short_name, english_name, testament, chapters) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (num, usfm, num, name, short_name, eng_name, testament, chapter_count),
        )
        print(f"  Book {num:>2}: {usfm:<4} {name:<30} [{testament}] {chapter_count}ch")

    # ── Insert verses ───────────────────────────────────────────
    book_chapters = {}  # usfm → set of chapter numbers

    for usfm, num, _, _ in USFM_ORDER:
        fname = os.path.join(BIBLE_DIR, f"{usfm}.json")
        if not os.path.exists(fname):
            print(f"  ✗ MISSING: {fname}")
            continue

        with open(fname, encoding="utf-8") as f:
            data = json.load(f)

        book_chapters[usfm] = set()
        verse_count = 0

        for ch_str, verses in data.items():
            chapter = int(ch_str)
            book_chapters[usfm].add(chapter)

            for vs_str, text in verses.items():
                verse = int(vs_str)
                # Trim outer whitespace but preserve internal newlines (poetry)
                clean_text = text.strip() if text else ""
                conn.execute(
                    "INSERT INTO verses (book_id, chapter, verse, text) "
                    "VALUES (?, ?, ?, ?)",
                    (num, chapter, verse, clean_text),
                )
                verse_count += 1

        # Verify we got the right count
        total_chapters = len(book_chapters[usfm])
        print(f"  {usfm}: {verse_count} verses, {total_chapters} chapters")

    conn.commit()

    # ── Import TSK cross-references ──────────────────────────────
    TSK_ABBREV = {
        "Gen":1,"Exod":2,"Lev":3,"Num":4,"Deut":5,"Josh":6,"Judg":7,"Ruth":8,
        "1Sam":9,"2Sam":10,"1Kgs":11,"2Kgs":12,"1Chr":13,"2Chr":14,
        "Ezra":15,"Neh":16,"Esth":17,"Job":18,"Ps":19,"Prov":20,
        "Eccl":21,"Song":22,"Isa":23,"Jer":24,"Lam":25,"Ezek":26,"Dan":27,
        "Hos":28,"Joel":29,"Amos":30,"Obad":31,"Jonah":32,"Mic":33,
        "Nah":34,"Hab":35,"Zeph":36,"Hag":37,"Zech":38,"Mal":39,
        "Matt":40,"Mark":41,"Luke":42,"John":43,"Acts":44,
        "Rom":45,"1Cor":46,"2Cor":47,"Gal":48,"Eph":49,"Phil":50,"Col":51,
        "1Thess":52,"2Thess":53,"1Tim":54,"2Tim":55,"Titus":56,"Phlm":57,"Heb":58,
        "Jas":59,"1Pet":60,"2Pet":61,"1John":62,"2John":63,"3John":64,"Jude":65,"Rev":66,
    }

    TSK_PATH = os.path.join(BASE_DIR, "extracted", "tsk", "cross_references.txt")
    if not os.path.exists(TSK_PATH):
        print(f"\n⚠ TSK file not found at {TSK_PATH} — skipping cross-references")
        print("  Download from: https://a.openbible.info/data/cross-references.zip")
    else:
        print(f"\nImporting TSK cross-references from {TSK_PATH}...")

        cr_count = 0
        skipped = 0
        with open(TSK_PATH, encoding="utf-8") as f:
            next(f)  # Skip header
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split("\t")
                if len(parts) < 3:
                    continue
                src_raw, tgt_raw, votes_raw = parts[0], parts[1], parts[2]

                # Parse votes — only include references with positive votes
                try:
                    votes = int(votes_raw)
                except ValueError:
                    continue
                if votes < 20:
                    continue

                # Parse source verse (e.g., "Gen.1.1")
                src_match = re.match(r"([A-Za-z0-9]+)\.(\d+)\.(\d+)", src_raw)
                if not src_match:
                    continue
                src_book_abbr = src_match.group(1)
                src_ch = int(src_match.group(2))
                src_vs = int(src_match.group(3))
                src_book_id = TSK_ABBREV.get(src_book_abbr)
                if not src_book_id:
                    skipped += 1
                    continue

                # Parse target verse (e.g., "Rom.1.19" or "Rom.1.19-Rom.1.20")
                tgt_match = re.match(
                    r"([A-Za-z0-9]+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9]+)\.(\d+)\.(\d+))?",
                    tgt_raw,
                )
                if not tgt_match:
                    continue
                tgt_book_abbr = tgt_match.group(1)
                tgt_ch = int(tgt_match.group(2))
                tgt_vs = int(tgt_match.group(3))
                tgt_book_id = TSK_ABBREV.get(tgt_book_abbr)
                if not tgt_book_id:
                    skipped += 1
                    continue

                # Handle verse range
                if tgt_match.group(4):  # Range end
                    ref_end_ch = int(tgt_match.group(5))
                    ref_end_vs = int(tgt_match.group(6))
                else:
                    ref_end_ch = tgt_ch
                    ref_end_vs = tgt_vs

                conn.execute(
                    "INSERT INTO cross_references (book_id, chapter, verse, "
                    "ref_book_id, ref_chapter, ref_verse, ref_end_chapter, ref_end_verse, votes) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (src_book_id, src_ch, src_vs,
                     tgt_book_id, tgt_ch, tgt_vs, ref_end_ch, ref_end_vs, votes),
                )
                cr_count += 1

                if cr_count % 50000 == 0:
                    conn.commit()
                    print(f"  ... {cr_count:,} references")

        conn.commit()
        print(f"  Imported {cr_count:,} references (skipped {skipped} with unknown books)")

    # Version marker for schema migration
    conn.execute("INSERT INTO meta (key, value) VALUES ('data_version_v2', '1')")
    conn.commit()

    # ── Build FTS index ─────────────────────────────────────────
    print("\nBuilding FTS5 index...")
    conn.execute("INSERT INTO verses_fts(verses_fts) VALUES('rebuild')")
    conn.commit()

    # ── Verifications ───────────────────────────────────────────
    print("\n=== Verifying ===")

    book_count = conn.execute("SELECT COUNT(*) FROM books").fetchone()[0]
    assert book_count == 66, f"Expected 66 books, got {book_count}"
    print(f"  ✓ books: {book_count}")

    verse_count = conn.execute("SELECT COUNT(*) FROM verses").fetchone()[0]
    assert verse_count == 31102, f"Expected 31,102 verses, got {verse_count}"
    print(f"  ✓ verses: {verse_count:,}")

    fts_count = conn.execute("SELECT COUNT(*) FROM verses_fts").fetchone()[0]
    print(f"  ✓ verses_fts: {fts_count:,} entries")

    ngai_hits = conn.execute(
        "SELECT COUNT(*) FROM verses_fts WHERE verses_fts MATCH '\"ngai\"*'"
    ).fetchone()[0]
    assert ngai_hits > 0, "FTS probe failed!"
    print(f"  ✓ FTS probe: {ngai_hits:,} hits for 'ngai'")

    # Spot-check first/last verses
    gen1 = conn.execute(
        "SELECT text FROM verses WHERE book_id=1 AND chapter=1 AND verse=1"
    ).fetchone()
    expected_gen1 = "O KĨAMBĨRĨRIA-RĨ, Ngai aatũmire kũgĩe matu-inĩ na gũkũ thĩ."
    assert gen1 and gen1[0].startswith(expected_gen1[:30]), f"Gen 1:1 mismatch: {gen1}"
    print(f"  ✓ Gen 1:1: {gen1[0][:60]}...")

    rev22 = conn.execute(
        "SELECT text FROM verses WHERE book_id=66 AND chapter=22 AND verse=21"
    ).fetchone()
    assert rev22 and len(rev22[0]) > 20, f"Rev 22:21 mismatch: {rev22}"
    print(f"  ✓ Rev 22:21: {rev22[0][:60]}...")

    # Spot-check Johana 3:16 (famous verse)
    jhn316 = conn.execute(
        "SELECT text FROM verses WHERE book_id=43 AND chapter=3 AND verse=16"
    ).fetchone()
    assert jhn316 and "Ngai" in jhn316[0], f"John 3:16 mismatch: {jhn316}"
    print(f"  ✓ Johana 3:16: {jhn316[0][:60]}...")

    # Verify all books have correct chapter counts (sanity check)
    expected_chapters = {
        1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4,
        9: 31, 10: 24, 11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13,
        17: 10, 18: 42, 19: 150, 20: 31, 21: 12, 22: 8, 23: 66, 24: 52,
        25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9, 31: 1, 32: 4,
        33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4, 40: 28,
        41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6,
        49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3,
        57: 1, 58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1,
        65: 1, 66: 22,
    }
    for book_id, exp_ch in expected_chapters.items():
        actual_ch = conn.execute(
            "SELECT COUNT(DISTINCT chapter) FROM verses WHERE book_id=?", (book_id,)
        ).fetchone()[0]
        if actual_ch != exp_ch:
            print(f"  ⚠ Book {book_id}: expected {exp_ch} chapters, got {actual_ch}")

    # ── Finalize: checkpoint WAL, switch to DELETE mode ──────────
    print("\nFinalizing database...")
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA page_size = 4096")
    conn.execute("VACUUM")
    conn.close()

    # Remove any lingering WAL/SHM files
    for suffix in ("-wal", "-shm"):
        p = DB_PATH + suffix
        if os.path.exists(p):
            os.remove(p)

    db_size = os.path.getsize(DB_PATH)
    print(f"\n✓ Done! {db_size:,} bytes ({db_size/1024/1024:.1f} MB)")
    print(f"  Output: {DB_PATH}")


if __name__ == "__main__":
    build()
