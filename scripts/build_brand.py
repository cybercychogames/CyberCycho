"""Generate CyberCycho brand assets: icon mark, wordmark, lockups, favicons, SVG."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "brand"
FONTS = ROOT / "fonts"
OUT = ROOT
OUT.mkdir(parents=True, exist_ok=True)

# ---- brand tokens (single source of truth, matches style.css) ----
BG = (10, 10, 18, 255)          # #0a0a12
CARD = (20, 20, 31, 255)        # #14141f
CYAN = (46, 255, 224, 255)      # #2effe0
PINK = (255, 46, 136, 255)      # #ff2e88
YELLOW = (244, 224, 77, 255)    # #f4e04d
BORDER = (42, 42, 61, 255)      # #2a2a3d

# ---- 1. Icon mark: blocky pixel "C" on a 16x16 grid ----
# 1 = filled. Bold, open-C shape, legible down to 16px.
C_GRID = [
    "0001111100000000",
    "0011111111000000",
    "0111111111100000",
    "1111000001110000",
    "1110000000110000",
    "1110000000000000",
    "1110000000000000",
    "1110000000000000",
    "1110000000000000",
    "1110000000000000",
    "1110000000000000",
    "1110000000110000",
    "1111000001110000",
    "0111111111100000",
    "0011111111000000",
    "0001111100000000",
]
GRID_W = len(C_GRID[0])
GRID_H = len(C_GRID)


def render_icon(cell: int, glitch: bool, bg_square: bool) -> Image.Image:
    """Render the pixel-C mark. glitch=offset cyan/pink/yellow like the site's
    text-shadow effect; bg_square=draw the rounded dark-navy app-icon backdrop."""
    pad = cell  # 1-cell padding on all sides
    w, h = GRID_W * cell + pad * 2, GRID_H * cell + pad * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    if bg_square:
        radius = cell * 3
        bg_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(bg_layer)
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=BG)
        img = Image.alpha_composite(img, bg_layer)

    def stamp(color, dx, dy, alpha=255):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for y, row in enumerate(C_GRID):
            for x, v in enumerate(row):
                if v == "1":
                    x0, y0 = pad + x * cell + dx, pad + y * cell + dy
                    d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1],
                                fill=(*color[:3], alpha))
        return layer

    offset = max(1, cell // 8) if glitch else 0
    if glitch:
        img = Image.alpha_composite(img, stamp(PINK, -offset, 0, 180))
        img = Image.alpha_composite(img, stamp(YELLOW, offset, 0, 140))
    img = Image.alpha_composite(img, stamp(CYAN, 0, 0, 255))
    return img


# Master icon: app-icon style (dark rounded square backdrop), 1024px.
# cell=1024/(16+2)=56.9 isn't integer, so render slightly under then NEAREST
# up to exactly 1024 -- keeps every edge a hard pixel step, no AA smoothing.
_cell = 1024 // (GRID_W + 2)
master_icon = render_icon(cell=_cell, glitch=True, bg_square=True)
master_icon = master_icon.resize((1024, 1024), Image.NEAREST)
master_icon.save(OUT / "icon-mark-1024.png")

# Transparent icon (no backdrop) for overlay / watermark use
transparent_icon = render_icon(cell=64, glitch=True, bg_square=False)
transparent_icon.save(OUT / "icon-mark-transparent.png")

# ---- 2. SVG icon (vector, pixel-perfect from the same grid) ----
def svg_icon(glitch=True, bg_square=True, cell=32) -> str:
    pad = cell
    w, h = GRID_W * cell + pad * 2, GRID_H * cell + pad * 2
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">']
    if bg_square:
        r = cell * 3
        parts.append(f'<rect x="0" y="0" width="{w}" height="{h}" rx="{r}" ry="{r}" fill="#0a0a12"/>')

    def layer(hexcolor, dx, dy, opacity=1):
        rects = []
        for y, row in enumerate(C_GRID):
            for x, v in enumerate(row):
                if v == "1":
                    x0, y0 = pad + x * cell + dx, pad + y * cell + dy
                    rects.append(f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" fill="{hexcolor}" fill-opacity="{opacity}"/>')
        return "".join(rects)

    offset = max(1, cell // 8) if glitch else 0
    if glitch:
        parts.append(layer("#ff2e88", -offset, 0, 0.7))
        parts.append(layer("#f4e04d", offset, 0, 0.55))
    parts.append(layer("#2effe0", 0, 0, 1))
    parts.append("</svg>")
    return "".join(parts)


(OUT / "icon-mark.svg").write_text(svg_icon(glitch=True, bg_square=True))
(OUT / "icon-mark-transparent.svg").write_text(svg_icon(glitch=True, bg_square=False))
(OUT / "icon-mark-mono.svg").write_text(svg_icon(glitch=False, bg_square=True))

# ---- 3. Wordmark: "CyberCycho" in Press Start 2P, rendered small then
#         hard-thresholded + NEAREST-upscaled so every edge is a crisp integer
#         pixel step — matching the icon mark's blocky grid, not smooth AA ----
def render_wordmark(target_h=200, base_h=50) -> Image.Image:
    upscale = max(1, round(target_h / base_h))
    font_size = int(base_h * 0.62)
    font = ImageFont.truetype(str(FONTS / "PressStart2P-Regular.ttf"), font_size)
    text = "CyberCycho"

    probe = Image.new("L", (10, 10), 0)
    bbox = ImageDraw.Draw(probe).textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    offset = 1  # 1 small-px offset -> becomes `upscale` real px after NEAREST scale
    pad = offset * 3 + 1
    w, h = tw + pad * 2, base_h

    def stamp_mask(dx, dy):
        layer = Image.new("L", (w, h), 0)
        d = ImageDraw.Draw(layer)
        y = (h - th) // 2 - bbox[1]
        d.text((pad + dx - bbox[0], y + dy), text, font=font, fill=255)
        # binarize: no gray/AA edges, pure on/off pixels
        return layer.point(lambda p: 255 if p >= 128 else 0)

    def colorize(mask, color, alpha):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        solid = Image.new("RGBA", (w, h), (*color[:3], alpha))
        layer.paste(solid, (0, 0), mask)
        return layer

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img = Image.alpha_composite(img, colorize(stamp_mask(-offset, 0), PINK, 200))
    img = Image.alpha_composite(img, colorize(stamp_mask(offset, 0), YELLOW, 160))
    img = Image.alpha_composite(img, colorize(stamp_mask(0, 0), CYAN, 255))

    return img.resize((w * upscale, h * upscale), Image.NEAREST)


wordmark = render_wordmark(target_h=200)
wordmark.save(OUT / "wordmark-transparent.png")

wordmark_on_bg = Image.new("RGBA", wordmark.size, BG)
wordmark_on_bg = Image.alpha_composite(wordmark_on_bg, wordmark)
wordmark_on_bg.save(OUT / "wordmark-on-dark.png")

# ---- 4. Lockups: icon + wordmark ----
def horizontal_lockup() -> Image.Image:
    icon = render_icon(cell=18, glitch=True, bg_square=True)
    wm = render_wordmark(target_h=icon.height)
    gap = int(icon.width * 0.4)
    w = icon.width + gap + wm.width
    h = max(icon.height, wm.height)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img.paste(icon, (0, (h - icon.height) // 2), icon)
    img.paste(wm, (icon.width + gap, (h - wm.height) // 2), wm)
    return img


def stacked_lockup() -> Image.Image:
    icon = render_icon(cell=22, glitch=True, bg_square=True)
    wm = render_wordmark(target_h=int(icon.height * 0.55))
    gap = int(icon.height * 0.25)
    w = max(icon.width, wm.width)
    h = icon.height + gap + wm.height
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img.paste(icon, ((w - icon.width) // 2, 0), icon)
    img.paste(wm, ((w - wm.width) // 2, icon.height + gap), wm)
    return img


horizontal_lockup().save(OUT / "logo-horizontal.png")
stacked_lockup().save(OUT / "logo-stacked.png")

# ---- 5. Favicons + app/game icon set ----
# Each size is rendered fresh at the largest integer cell that fits, then
# NEAREST-padded to the exact target -- downsampling the 1024 master with a
# smoothing filter would blur small favicons back into anti-aliased mush.
def icon_at(size: int) -> Image.Image:
    cell = max(1, size // (GRID_W + 2))
    rendered = render_icon(cell=cell, glitch=(size >= 48), bg_square=True)
    return rendered.resize((size, size), Image.NEAREST)


sizes = [16, 32, 48, 180, 192, 512, 1024]
for s in sizes:
    icon_at(s).save(OUT / f"icon-{s}.png")

# Proper multi-resolution .ico (Pillow supports this natively)
ico_sizes = [(16, 16), (32, 32), (48, 48), (256, 256)]
icon_at(256).save(OUT / "favicon.ico", sizes=ico_sizes)

print("Generated:")
for f in sorted(OUT.glob("*")):
    if f.is_file():
        print(" -", f.relative_to(ROOT.parent.parent))
