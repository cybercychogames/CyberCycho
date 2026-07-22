"""Generate the Brackeys Game Jam 2026.2 retro pixel-art banner."""

from pathlib import Path

from PIL import Image, ImageDraw


WIDTH, HEIGHT = 920, 430
BG = "#0a0a12"
CYAN = "#2effe0"
PINK = "#ff2e88"
YELLOW = "#f4e04d"


# 3x5 blocky pixel font — hand-drawn so every glyph stays legible when scaled.
FONT = {
    "A": ["111", "101", "111", "101", "101"],
    "B": ["110", "101", "110", "101", "110"],
    "C": ["111", "100", "100", "100", "111"],
    "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "110", "100", "111"],
    "G": ["111", "100", "101", "101", "111"],
    "H": ["101", "101", "111", "101", "101"],
    "I": ["111", "010", "010", "010", "111"],
    "J": ["001", "001", "001", "101", "111"],
    "K": ["101", "110", "100", "110", "101"],
    "M": ["101", "111", "111", "101", "101"],
    "O": ["111", "101", "101", "101", "111"],
    "R": ["110", "101", "110", "101", "101"],
    "S": ["111", "100", "111", "001", "111"],
    "T": ["111", "010", "010", "010", "010"],
    "Y": ["101", "101", "010", "010", "010"],
    "0": ["111", "101", "101", "101", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "6": ["111", "100", "111", "101", "111"],
    ".": ["000", "000", "000", "000", "010"],
    "/": ["001", "001", "010", "100", "100"],
    " ": ["000", "000", "000", "000", "000"],
}


def text_width(text, scale):
    return (len(text) * 4 - 1) * scale


def block_text(draw, text, top, color, scale, center_x=WIDTH // 2):
    """Draw text with the 3x5 block font, centered horizontally."""
    x = center_x - text_width(text, scale) // 2
    for ch in text.upper():
        glyph = FONT.get(ch, FONT[" "])
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit == "1":
                    px = x + col * scale
                    py = top + row * scale
                    draw.rectangle((px, py, px + scale - 1, py + scale - 1), fill=color)
        x += 4 * scale


def rect(draw, box, color):
    draw.rectangle(box, fill=color)


def make_banner():
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    # Offset neon frame and sparse corner grid.
    draw.rectangle((22, 22, 897, 407), outline=CYAN, width=4)
    draw.rectangle((30, 30, 889, 399), outline=PINK, width=2)
    for x in range(54, 198, 24):
        for y in range(54, 102, 24):
            rect(draw, (x, y, x + 3, y + 3), YELLOW)

    # Big, deliberately low-resolution typography.
    block_text(draw, "BRACKEYS", 52, CYAN, 20)
    block_text(draw, "GAME JAM 2026.2", 182, PINK, 12)
    block_text(draw, "// ITCH.IO // 4 DAYS", 352, YELLOW, 8)

    # Left: chunky controller with D-pad and two action buttons.
    rect(draw, (64, 258, 192, 310), CYAN)
    rect(draw, (48, 274, 208, 294), CYAN)
    rect(draw, (64, 310, 91, 326), CYAN)
    rect(draw, (165, 310, 192, 326), CYAN)
    rect(draw, (82, 270, 102, 298), BG)
    rect(draw, (78, 278, 106, 290), BG)
    rect(draw, (158, 274, 169, 285), PINK)
    rect(draw, (176, 286, 187, 297), YELLOW)

    # Right: pixel die, pips, and small four-point stars.
    rect(draw, (734, 248, 824, 338), PINK)
    rect(draw, (742, 256, 816, 330), BG)
    for x, y in ((754, 268), (792, 268), (773, 287), (754, 306), (792, 306)):
        rect(draw, (x, y, x + 10, y + 10), YELLOW)
    for x, y, color in ((690, 268, CYAN), (854, 214, YELLOW), (862, 322, CYAN)):
        rect(draw, (x - 3, y - 14, x + 3, y + 14), color)
        rect(draw, (x - 14, y - 3, x + 14, y + 3), color)

    # Thin dark scanlines, spaced on a strict 4-pixel rhythm.
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    scan = ImageDraw.Draw(overlay)
    for y in range(2, HEIGHT, 4):
        scan.line((0, y, WIDTH - 1, y), fill=(0, 0, 0, 72), width=1)
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    return image


if __name__ == "__main__":
    output = Path(__file__).resolve().parents[1] / "assets/img/brackeys-jam-2026-2.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    make_banner().save(output, optimize=True)
    print(f"Wrote {output} ({WIDTH}x{HEIGHT})")
