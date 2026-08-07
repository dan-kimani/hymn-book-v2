#!/usr/bin/env python3
"""
Build SQLite hymn database from raw .txt files.
Parses all 4 hymn books, extracts titles and structured verses,
indexes every stanza in FTS5 for surgical full-text search.

Output: assets/data/hymns.db
"""

import sqlite3
import re
import os
import json
import unicodedata

# ── Configuration ──────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLLECTIONS_DIR = os.path.join(BASE_DIR, "extracted", "hymns", "all_collections")
OUTPUT_DIR = os.path.join(BASE_DIR, "assets", "data")
DB_PATH = os.path.join(OUTPUT_DIR, "hymns.db")

BOOKS = [
    {
        "dir": "Nyimbo Cia Roho Mutheru",
        "id": "roho-mutheru",
        "name": "Nyimbo Cia Roho Mutheru",
        "language": "ki",
        "color": "#2563EB",
        "expected_count": 555,
    },
    {
        "dir": "Nyimbo Cia Atumwo",
        "id": "atumwo",
        "name": "Nyimbo Cia Atumwo",
        "language": "ki",
        "color": "#7C3AED",
        "expected_count": 218,
    },
    {
        "dir": "Nyimbo Cia Kiroho",
        "id": "kiroho",
        "name": "Nyimbo Cia Kiroho",
        "language": "ki",
        "color": "#059669",
        "expected_count": 464,
    },
    {
        "dir": "Golden Bells",
        "id": "golden-bells",
        "name": "Golden Bells",
        "language": "en",
        "color": "#DC2626",
        "expected_count": 771,
    },
]

# ── Unicode / OCR helpers ──────────────────────────────────────

def fold_diacritics(text: str) -> str:
    """NFD decompose → strip combining marks → recombine.
    'Mũhonokia' → 'Muhonokia', 'ĩ' → 'i', 'ũ' → 'u'"""
    nfd = unicodedata.normalize('NFD', text)
    return ''.join(c for c in nfd if not unicodedata.combining(c))

def normalize_search(text: str) -> str:
    """Fold diacritics + lowercase + collapse whitespace, for FTS indexing."""
    return re.sub(r'\s+', ' ', fold_diacritics(text).lower()).strip()

def ocr_cleanup_english(text: str) -> str:
    """Fix OCR artifacts found in Golden Bells."""
    replacements = [
        ('fi|l', 'fill'),
        ('Fi|l', 'Fill'),
        ('Bight', 'Bright'),
        ('`', "'"),
        # Fix "0" used as "O" in words like "0 Saviour", "0 boys"
    ]
    # Fix leading "0 " at word boundaries where it means "O"
    text = re.sub(r'\b0\s+(?=[A-Z])', 'O ', text)
    for old, new in replacements:
        text = text.replace(old, new)
    return text


# ── Verse parsing ──────────────────────────────────────────────

# Matches a verse-marker line: optional whitespace, digits, optional dot/space
VERSE_MARKER_RE = re.compile(r'^\s*(\d{1,3})\s*[\.\s]?\s*$')

# Matches a verse number with inline text: "1 Mũhonokia nĩagoka;" or "338 INYUĨ..."
INLINE_VERSE_RE = re.compile(r'^\s*(\d{1,3})\s*[\.\s]\s+(\S.*)$')

# Roman numeral I used as verse 1 in Golden Bells
ROMAN_I_RE = re.compile(r'^\s*I\s*[\.\s]?\s*$')

def is_verse_marker(line: str, is_english: bool = False) -> tuple:
    """
    Check if a line is a verse marker.
    Returns (is_marker, verse_number, remaining_text_or_None)
    """
    stripped = line.strip()
    if not stripped:
        return (False, 0, None)

    # Try inline verse pattern first: "1 Some text here"
    m = INLINE_VERSE_RE.match(line)
    if m:
        return (True, int(m.group(1)), m.group(2))

    # Try standalone marker: "1.", " 2.", "3", " 4 "
    m = VERSE_MARKER_RE.match(line)
    if m:
        return (True, int(m.group(1)), None)

    # Roman numeral I for Golden Bells
    if is_english and ROMAN_I_RE.match(line):
        return (True, 1, None)

    return (False, 0, None)


def parse_hymn(content: str, is_english: bool = False) -> dict:
    """
    Parse hymn text into structured verses.
    Returns {"title": str, "first_line": str, "verses": [{number, stanzas: [[str]]}]}
    """
    lines = content.split('\n')
    verses = []
    current_verse_num = None
    current_stanzas = []   # list of stanzas in current verse
    current_stanza = []    # lines in current stanza
    title = ""
    first_line = ""
    header_lines = []      # lines before first verse (scripture refs, etc.)

    # Detect if first verse is unnumbered (Golden Bells edge case).
    # Look past potential header lines (scripture refs, etc.) to find the
    # first actual verse marker or hymn content.
    first_verse_start_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        is_m, num, _ = is_verse_marker(line, is_english)
        if is_m and num > 0:
            first_verse_start_idx = i
            break

    # Lines before the first verse marker are headers (scripture refs, etc.)
    for i in range(first_verse_start_idx):
        if lines[i].strip():
            header_lines.append(lines[i].strip())

    # Check if we actually found a numbered first verse
    has_numbered_first_verse = first_verse_start_idx > 0 and is_verse_marker(
        lines[first_verse_start_idx], is_english
    )[0] if first_verse_start_idx < len(lines) else False

    if not has_numbered_first_verse and first_verse_start_idx < len(lines):
        # No verse marker found at all — treat the first content block as verse 1
        current_verse_num = 1
    elif first_verse_start_idx == 0:
        # First non-empty line is already a verse marker
        pass

    for line in lines:
        stripped = line.strip()
        is_marker, num, rest = is_verse_marker(line, is_english)

        if is_marker and num > 0:
            # Save previous verse
            if current_verse_num is not None and current_stanza:
                current_stanzas.append(current_stanza)
                current_stanza = []
            if current_verse_num is not None and current_stanzas:
                verses.append({
                    "number": current_verse_num,
                    "stanzas": [s for s in current_stanzas if s]
                })

            current_verse_num = num
            current_stanzas = []
            current_stanza = []

            if rest:
                # Inline text after verse number
                cleaned = rest.strip()
                current_stanza.append(cleaned)
                if not title:
                    title = cleaned
                if not first_line:
                    first_line = cleaned
        elif current_verse_num is None:
            # Before any verse starts: skip (headers already captured in pre-scan)
            pass
        elif stripped == "":
            # Blank line → end of current stanza
            if current_stanza:
                current_stanzas.append(current_stanza)
                current_stanza = []
        else:
            # Lyric line within current verse
            current_stanza.append(stripped)
            if not title:
                title = stripped
            if not first_line:
                first_line = stripped

    # Save last verse
    if current_stanza:
        current_stanzas.append(current_stanza)
    if current_verse_num is not None:
        verses.append({
            "number": current_verse_num,
            "stanzas": [s for s in current_stanzas if s]
        })

    # Clean title
    SCRIPTURE_REF_RE = re.compile(
        r'^[A-Za-z]+\s+\d{1,3}(:\d{1,3})?(-\d{1,3}(:\d{1,3})?)?'
        r'(\s*[;,]\s*[A-Za-z]+\s+\d{1,3}(:\d{1,3})?(-\d{1,3}(:\d{1,3})?)?)*$'
    )

    def is_scripture_ref(text: str) -> bool:
        """Check if text looks like a scripture reference (Thama 20:1-18; Mathayo 22:37-41)."""
        return bool(SCRIPTURE_REF_RE.match(text.strip()))

    if title:
        # Strip garbage: trailing isolated numbers, leading number tokens
        title = re.sub(r'\s+\d{1,3}\s*\.?\s*$', '', title)
        title = re.sub(r'^\s*\d{1,4}\s*\.?\s*', '', title)
        title = title.strip(' .,;:')
        # If title is a scripture reference, try the first verse content instead
        if is_scripture_ref(title) and verses:
            for stanza in verses[0].get("stanzas", []):
                if stanza and not is_scripture_ref(stanza[0]):
                    title = stanza[0]
                    break
    if not title and header_lines:
        for h in header_lines:
            if not is_scripture_ref(h):
                title = h.strip(' .,;:')
                break
    if not title:
        title = "Untitled"

    return {
        "title": title,
        "first_line": first_line or title,
        "header": header_lines,
        "verses": verses,
    }


# ── Main build ─────────────────────────────────────────────────

def build():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Remove existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    # ── Schema ──
    conn.executescript("""
        CREATE TABLE books (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            language TEXT NOT NULL,
            count INTEGER NOT NULL,
            color TEXT NOT NULL
        );

        CREATE TABLE hymns (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id),
            number INTEGER NOT NULL,
            title TEXT NOT NULL,
            first_line TEXT NOT NULL,
            verses_json TEXT NOT NULL
        );

        CREATE INDEX idx_hymns_book ON hymns(book_id);
        CREATE INDEX idx_hymns_number ON hymns(book_id, number);

        -- Stanzas content table (for FTS5 content=)
        CREATE TABLE stanzas_content (
            hymn_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            book_name TEXT NOT NULL,
            hymn_number INTEGER NOT NULL,
            hymn_title TEXT NOT NULL,
            verse_number INTEGER NOT NULL,
            stanza_index INTEGER NOT NULL,
            stanza_text TEXT NOT NULL
        );

        -- FTS5 virtual table over stanzas (rebuilt at runtime)
        CREATE VIRTUAL TABLE stanzas_fts USING fts5(
            stanza_text,
            content=stanzas_content,
            content_rowid=rowid,
            tokenize='unicode61'
        );

        -- Metadata
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    """)

    total_hymns = 0
    total_stanzas = 0
    book_summaries = []

    for book in BOOKS:
        coll_path = os.path.join(COLLECTIONS_DIR, book["dir"])
        if not os.path.isdir(coll_path):
            print(f"WARNING: Directory not found: {coll_path}")
            continue

        txt_files = sorted([
            f for f in os.listdir(coll_path)
            if f.endswith('.txt') and f != 'INDEX.md'
        ])

        print(f"Processing {book['name']}: {len(txt_files)} files...")

        conn.execute(
            "INSERT OR REPLACE INTO books (id, name, language, count, color) VALUES (?,?,?,?,?)",
            (book["id"], book["name"], book["language"], len(txt_files), book["color"])
        )

        hymn_count = 0
        for fname in txt_files:
            fpath = os.path.join(coll_path, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                raw = f.read()

            # Extract hymn number from filename
            num_match = re.match(r'^(\d{1,4})', fname)
            if not num_match:
                print(f"  WARNING: Could not extract number from {fname}")
                continue
            hymn_number = int(num_match.group(1))

            # OCR cleanup for English
            is_english = book["language"] == "en"
            if is_english:
                raw = ocr_cleanup_english(raw)

            parsed = parse_hymn(raw, is_english=is_english)

            hymn_id = f"{book['id']}:{hymn_number}"

            # Full search text (diacritic-folded for Kikuyu)
            verses_json = json.dumps(parsed["verses"], ensure_ascii=False)
            conn.execute(
                """INSERT INTO hymns (id, book_id, number, title, first_line, verses_json)
                   VALUES (?,?,?,?,?,?)""",
                (hymn_id, book["id"], hymn_number, parsed["title"],
                 parsed["first_line"], verses_json)
            )

            # Index each stanza individually
            stanza_index_global = 0
            for verse in parsed["verses"]:
                for si, stanza in enumerate(verse["stanzas"]):
                    if not stanza:
                        continue
                    stanza_text = '\n'.join(stanza)
                    conn.execute(
                        """INSERT INTO stanzas_content
                           (hymn_id, book_id, book_name, hymn_number, hymn_title,
                            verse_number, stanza_index, stanza_text)
                           VALUES (?,?,?,?,?,?,?,?)""",
                        (hymn_id, book["id"], book["name"], hymn_number,
                         parsed["title"], verse["number"], si,
                         stanza_text)
                    )
                    stanza_index_global += 1
                    total_stanzas += 1

            hymn_count += 1
            total_hymns += 1

        book_summaries.append(f"  {book['name']}: {hymn_count} hymns")
        print(f"  Done: {hymn_count} hymns")

    # Populate FTS index
    print(f"Building FTS5 index over {total_stanzas} stanzas...")
    conn.execute("INSERT INTO stanzas_fts(stanzas_fts) VALUES('rebuild')")
    conn.commit()
    print("FTS index ready")

    # Write metadata
    conn.execute(
        "INSERT INTO meta (key, value) VALUES (?, ?)",
        ("data_version_v2", "1")
    )
    conn.execute(
        "INSERT INTO meta (key, value) VALUES (?, ?)",
        ("total_hymns", str(total_hymns))
    )
    conn.execute(
        "INSERT INTO meta (key, value) VALUES (?, ?)",
        ("total_stanzas", str(total_stanzas))
    )

    conn.commit()

    # ── Verify ──
    print("\n── Verification ──")
    errors = []
    for book in BOOKS:
        row = conn.execute(
            "SELECT COUNT(*) FROM hymns WHERE book_id = ?", (book["id"],)
        ).fetchone()
        actual = row[0]
        expected = book["expected_count"]
        status = "✓" if actual == expected else "✗"
        print(f"  {status} {book['name']}: {actual} (expected {expected})")
        if actual != expected:
            errors.append(f"Count mismatch for {book['name']}")

    # Check contiguous numbering
    for book in BOOKS:
        rows = conn.execute(
            "SELECT number FROM hymns WHERE book_id = ? ORDER BY number",
            (book["id"],)
        ).fetchall()
        nums = [r[0] for r in rows]
        if nums:
            expected_range = list(range(min(nums), max(nums) + 1))
            if nums != expected_range:
                missing = set(expected_range) - set(nums)
                dups = [n for n in nums if nums.count(n) > 1]
                if missing:
                    errors.append(f"{book['name']}: missing numbers {sorted(missing)[:10]}...")
                if dups:
                    errors.append(f"{book['name']}: duplicate numbers {list(set(dups))[:10]}")

    if errors:
        print(f"\n❌ {len(errors)} ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print(f"\n✓ All checks passed — {total_hymns} hymns, {total_stanzas} stanzas")

    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA page_size = 4096")
    conn.execute("VACUUM")
    conn.close()

    db_size = os.path.getsize(DB_PATH)
    print(f"Database: {DB_PATH} ({db_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    build()
