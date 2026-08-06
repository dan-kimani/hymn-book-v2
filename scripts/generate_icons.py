"""
Generate Kikuyu-inspired geometric book icon set for Nyimbo Cia Gikuyu.
Bold, readable at small sizes, warm indigo + gold palette.
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "images")

# ── Palette ─────────────────────────────────────────────────
BG_DEEP    = (18, 38, 72)       # deep indigo
BG_MID     = (28, 52, 94)       # mid blue for subtle gradient effect
PAGE       = (250, 243, 228)    # warm cream page
GOLD       = (218, 160, 55)     # kikuyu gold
GOLD_LIGHT = (240, 185, 90)    # lighter gold
GOLD_DARK  = (175, 125, 40)    # darker gold for small elements
BROWN      = (60, 35, 15)       # cover brown
WHITE_SOFT = (255, 250, 242)    # near-white warm

# ── Drawing helpers ──────────────────────────────────────────

def draw_diamond(draw, cx, cy, size, color):
    half = size / 2
    draw.polygon([(cx, cy - half), (cx + half, cy), (cx, cy + half), (cx - half, cy)], fill=color)

def draw_kikuyu_motif(draw, cx, cy, scale, color, alpha=255):
    """Concentric diamonds — bold enough to read at small sizes."""
    c = (*color, alpha) if len(color) == 3 else color
    s = scale
    # Outer diamond
    draw_diamond(draw, cx, cy, s * 0.9, (*color, min(alpha, 80)))
    # Middle diamond
    draw_diamond(draw, cx, cy, s * 0.5, (*color, min(alpha, 140)))
    # Inner diamond — solid
    draw_diamond(draw, cx, cy, s * 0.2, c)
    # Corner accent dots
    for dx, dy in [(0, -s * 0.82), (s * 0.82, 0), (0, s * 0.82), (-s * 0.82, 0)]:
        r = max(2, int(s * 0.07))
        draw.ellipse([cx+dx-r, cy+dy-r, cx+dx+r, cy+dy+r], fill=c)

def draw_chevron(draw, cx, y, w, h, color):
    """Single chevron ^ at given position."""
    draw.polygon([(cx - w/2, y + h), (cx, y), (cx + w/2, y + h)], fill=color)

# ── Main render ──────────────────────────────────────────────

def render_icon(size=1024, transparent_bg=False):
    """Render the icon. Set transparent_bg=True for adaptive foreground."""
    bg_color = (0, 0, 0, 0) if transparent_bg else BG_DEEP
    img = Image.new("RGBA", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    if not transparent_bg:
        # Rounded rect background
        r = int(size * 0.22)
        m = int(size * 0.06)
        draw.rounded_rectangle([m, m, size - m, size - m], radius=r, fill=BG_DEEP)
        # Subtle radial highlight
        s2 = size / 2
        for i in range(4):
            rad = int(size * (0.48 - i * 0.09))
            draw.ellipse([s2-rad, s2-rad, s2+rad, s2+rad], fill=(255,255,255, 8 + i * 3))

    s2 = size / 2

    # ── Book — bolder proportions for small-size clarity ──────
    bw = int(size * 0.36)   # book half-width
    bx = s2
    by = int(size * 0.54)   # book vertical center
    bh = int(size * 0.30)   # page height per side
    spine_gap = int(size * 0.02)  # gap at spine for open-book look

    # Book cover (visible below pages)
    cover_top = by + int(bh * 0.08)
    draw.rounded_rectangle(
        [bx - bw - int(size * 0.02), cover_top,
         bx + bw + int(size * 0.02), cover_top + int(size * 0.035)],
        radius=int(size * 0.01), fill=BROWN,
    )

    # Left page
    lx = bx - spine_gap
    draw.polygon([
        (bx - bw, by - bh),          # top-left
        (lx, by - bh - int(bh * 0.07)),  # top-spine (upward tilt)
        (lx, by),                     # bottom-spine
        (bx - bw, by),                # bottom-left
    ], fill=PAGE)

    # Right page
    rx = bx + spine_gap
    draw.polygon([
        (bx + bw, by - bh),           # top-right
        (rx, by - bh - int(bh * 0.07)),   # top-spine
        (rx, by),                      # bottom-spine
        (bx + bw, by),                 # bottom-right
    ], fill=WHITE_SOFT)

    # ── Kikuyu motifs on pages ────────────────────────────────
    motif_s = int(bh * 0.16)
    lm_x = bx - int(bw * 0.48)
    lm_y = by - int(bh * 0.5)
    draw_kikuyu_motif(draw, lm_x, lm_y, motif_s, GOLD)

    rm_x = bx + int(bw * 0.48)
    rm_y = by - int(bh * 0.5)
    draw_kikuyu_motif(draw, rm_x, rm_y, motif_s, GOLD)

    # Top chevron accents on each page
    ch_w = motif_s * 1.5
    ch_h = int(bh * 0.05)
    draw_chevron(draw, lm_x, by - bh - int(bh * 0.01), ch_w, ch_h, (*GOLD, 120))
    draw_chevron(draw, rm_x, by - bh - int(bh * 0.01), ch_w, ch_h, (*GOLD, 120))

    # ── Musical note above the book ───────────────────────────
    note_y = by - bh - int(bh * 0.42)
    note_r = int(size * 0.027)
    # Note head (filled oval)
    draw.ellipse(
        [bx - note_r - int(note_r * 0.4), note_y,
         bx + note_r + int(note_r * 0.4), note_y + note_r * 2],
        fill=GOLD,
    )
    # Stem
    stem_w = max(2, int(size * 0.007))
    draw.rectangle(
        [bx + int(note_r * 0.8), note_y - int(note_r * 2.5),
         bx + int(note_r * 0.8) + stem_w, note_y + int(note_r * 0.5)],
        fill=GOLD_LIGHT,
    )
    # Flag
    flag = int(note_r * 1.6)
    draw.polygon([
        (bx + int(note_r * 0.8) + stem_w, note_y - int(note_r * 1.8)),
        (bx + int(note_r * 0.8) + stem_w + flag, note_y - int(note_r * 0.6)),
        (bx + int(note_r * 0.8) + stem_w, note_y - int(note_r * 0.2)),
    ], fill=GOLD)

    # ── Spine dots ────────────────────────────────────────────
    dot_r = max(2, int(bh * 0.02))
    for i in range(4):
        dy = by - bh - int(bh * 0.03) + int(bh * 0.13) * i
        draw.ellipse([bx-dot_r, dy-dot_r, bx+dot_r, dy+dot_r], fill=GOLD_DARK)

    return img


def render_background_only(size=1024):
    """Solid background for Android adaptive icon."""
    img = Image.new("RGBA", (size, size), BG_DEEP)
    draw = ImageDraw.Draw(img)
    # Subtle gradient effect via concentric ellipses
    s2 = size / 2
    for i in range(3):
        rad = int(size * (0.5 - i * 0.12))
        draw.ellipse([s2-rad, s2-rad, s2+rad, s2+rad], fill=(255,255,255, 5 + i * 2))
    return img


# ── Generate ─────────────────────────────────────────────────

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Main icon (solid bg)
    img = render_icon(1024)
    img.save(os.path.join(OUT_DIR, "icon.png"), "PNG")
    print("icon.png (1024x1024)")

    # Adaptive foreground (transparent bg, design only)
    fg = render_icon(1024, transparent_bg=True)
    fg.save(os.path.join(OUT_DIR, "adaptive-icon.png"), "PNG")
    print("adaptive-icon.png (1024x1024, transparent)")

    # Splash icon
    img.save(os.path.join(OUT_DIR, "splash-icon.png"), "PNG")
    print("splash-icon.png (1024x1024)")

    # Favicon
    fav = render_icon(48)
    fav.save(os.path.join(OUT_DIR, "favicon.png"), "PNG")
    print("favicon.png (48x48)")

    # Adaptive background
    bg = render_background_only(1024)
    bg.save(os.path.join(OUT_DIR, "android-icon-background.png"), "PNG")
    print("android-icon-background.png (1024x1024)")

    # Foreground variations
    fg.save(os.path.join(OUT_DIR, "android-icon-foreground.png"), "PNG")
    fg.save(os.path.join(OUT_DIR, "android-icon-monochrome.png"), "PNG")
    print("android-icon-foreground/monochrome.png (1024x1024)")


if __name__ == "__main__":
    main()
