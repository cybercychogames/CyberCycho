"""Build full per-option brand kits for 6 icon concepts, organized by folder.
Fixes the outline-invisible-on-bg bug: backdrop=CARD, outline=BG (contrasting)."""
import pathlib
from PIL import Image, ImageDraw

REPO = pathlib.Path("/Users/huangcheng/ClaudeForMac/cybercychoWebsite")
BRAND = REPO / "assets" / "brand"
OPTIONS = BRAND / "options"
WORDMARK = Image.open(BRAND / "wordmark-transparent.png").convert("RGBA")

BG = (10, 10, 18, 255)       # #0a0a12 -- now used as OUTLINE color
CARD = (20, 20, 31, 255)     # #14141f -- now used as BACKDROP color
CYAN = (46, 255, 224, 255)
PINK = (255, 46, 136, 255)
YELLOW = (244, 224, 77, 255)

# Each grid: 20x20, '1'=fill, '2'=cutout(dark detail), '0'=empty.
# Redrawn fresh (not traced from the old flawed PNGs) per concept.
GRIDS = {}

GRIDS["1-cartridge"] = [
    "00011111111111100000",
    "00111111111111110000",
    "01111111111111111000",
    "11111111111111111100",
    "11112222222222111100",
    "11112222222222111100",
    "11112222222222111100",
    "11112222222222111100",
    "11111111111111111100",
    "11111111111111111100",
    "11111111111111111100",
    "11122111112211111100",
    "11122111112211111100",
    "11111111111111111100",
    "11122211122211122100",
    "11122211122211122100",
    "11111111111111111100",
    "01111111111111111000",
    "00111111111111110000",
    "00011111111111100000",
]

GRIDS["2-skull-mascot"] = [
    "00001111111111000000",
    "00011111111111100000",
    "00111111111111110000",
    "01111111111111111000",
    "11111111111111111100",
    "11112222111122211100",
    "11112222111122211100",
    "11112222111122211100",
    "11111111111111111100",
    "11111111111111111100",
    "11111112222211111100",
    "11111122222221111100",
    "11111111111111111100",
    "01111111111111111000",
    "01122111111112211000",
    "01122111111112211000",
    "00111122222211100000",
    "00011111111111100000",
    "00001111111111000000",
    "00000000000000000000",
]

GRIDS["3-handheld-console"] = [
    "00111111111111110000",
    "01111111111111111000",
    "11111111111111111100",
    "11122222222222221100",
    "11122222222222221100",
    "11122222222222221100",
    "11122222222222221100",
    "11122222222222221100",
    "11122222222222221100",
    "11111111111111111100",
    "01111111111111111000",
    "00111111111111110000",
    "00011111111111100000",
    "00011221111221100000",
    "00011221111221100000",
    "00011111111111100000",
    "00001111111111000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
]

GRIDS["4-letterform-c"] = [
    "00000111111111000000",
    "00011111111111110000",
    "00111111111111111100",
    "01111112222222111100",
    "01111112222222111100",
    "11111112222222211100",
    "11110000000000011100",
    "11110000000000000000",
    "11110000000000000000",
    "11110000000000000000",
    "11110000000000000000",
    "11110000000000000000",
    "11110000000000011100",
    "11111112222222211100",
    "01111112222222111100",
    "01111112222222111100",
    "00111111111111111100",
    "00011111111111110000",
    "00000111111111000000",
    "00000000000000000000",
]

GRIDS["5-capture-orb"] = [
    "00000111111111000000",
    "00011111111111110000",
    "00111111111111111100",
    "01111111111111111100",
    "11111111111111111100",
    "11111111111111111100",
    "11111111111111111100",
    "11111112222222111100",
    "00000002222222000000",
    "00000002222222000000",
    "00000002222222000000",
    "11111112222222111100",
    "11111111111111111100",
    "11111111111111111100",
    "11111111111111111100",
    "01111111111111111100",
    "00111111111111111100",
    "00011111111111110000",
    "00000111111111000000",
    "00000000000000000000",
]

GRIDS["6-controller-face"] = [
    "00000000000000000000",
    "00011100000001110000",
    "00011100000001110000",
    "00011100000001110000",
    "01111111000111111100",
    "01111111000111111100",
    "11111111000111111100",
    "11112221000122211100",
    "11112221000122211100",
    "11111111000111111100",
    "01111111000111111100",
    "01111111000111111100",
    "00011100000001110000",
    "00011100000001110000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
    "00000000000000000000",
]

GLITCH_ON = {"1-cartridge", "2-skull-mascot", "4-letterform-c", "6-controller-face"}
GRID_W = GRID_H = 20


def render_icon(name: str, cell: int, glitch: bool, backdrop: bool) -> Image.Image:
    grid = GRIDS[name]
    pad = cell
    w = h = GRID_W * cell + pad * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    if backdrop:
        radius = cell * 3
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=CARD)
        img = Image.alpha_composite(img, layer)

    def outline_pass():
        """1-grid-unit outline in BG, offset in all 4 directions -- shows up
        against the CARD backdrop (was invisible when outline==backdrop)."""
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for y, row in enumerate(grid):
            for x, v in enumerate(row):
                if v in "12":
                    for ddx, ddy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        x0, y0 = pad + (x + ddx) * cell, pad + (y + ddy) * cell
                        d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=BG)
        return layer

    def fill_pass(color, dx=0, dy=0, alpha=255):
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for y, row in enumerate(grid):
            for x, v in enumerate(row):
                x0, y0 = pad + x * cell + dx, pad + y * cell + dy
                if v == "1":
                    d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=(*color[:3], alpha))
                elif v == "2":
                    d.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=(*BG[:3], alpha))
        return layer

    img = Image.alpha_composite(img, outline_pass())
    offset = max(1, cell // 8) if glitch else 0
    if glitch:
        img = Image.alpha_composite(img, fill_pass(PINK, -offset, 0, 200))
        img = Image.alpha_composite(img, fill_pass(YELLOW, offset, 0, 160))
    img = Image.alpha_composite(img, fill_pass(CYAN, 0, 0, 255))
    return img


def svg_icon(name: str, cell=32) -> str:
    grid = GRIDS[name]
    glitch = name in GLITCH_ON
    pad = cell
    w = h = GRID_W * cell + pad * 2
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">']
    r = cell * 3
    parts.append(f'<rect x="0" y="0" width="{w}" height="{h}" rx="{r}" ry="{r}" fill="#14141f"/>')

    # outline
    for y, row in enumerate(grid):
        for x, v in enumerate(row):
            if v in "12":
                for ddx, ddy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    x0, y0 = pad + (x + ddx) * cell, pad + (y + ddy) * cell
                    parts.append(f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" fill="#0a0a12"/>')

    def layer(hexcolor, dx, dy, opacity):
        rects = []
        for y, row in enumerate(grid):
            for x, v in enumerate(row):
                x0, y0 = pad + x * cell + dx, pad + y * cell + dy
                if v == "1":
                    rects.append(f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" fill="{hexcolor}" fill-opacity="{opacity}"/>')
                elif v == "2":
                    rects.append(f'<rect x="{x0}" y="{y0}" width="{cell}" height="{cell}" fill="#0a0a12" fill-opacity="{opacity}"/>')
        return "".join(rects)

    offset = max(1, cell // 8) if glitch else 0
    if glitch:
        parts.append(layer("#ff2e88", -offset, 0, 0.78))
        parts.append(layer("#f4e04d", offset, 0, 0.63))
    parts.append(layer("#2effe0", 0, 0, 1))
    parts.append("</svg>")
    return "".join(parts)


def icon_at(name: str, size: int) -> Image.Image:
    cell = max(1, size // (GRID_W + 2))
    glitch = (name in GLITCH_ON) and size >= 48
    rendered = render_icon(name, cell=cell, glitch=glitch, backdrop=True)
    return rendered.resize((size, size), Image.NEAREST)


def build_option(name: str):
    out = OPTIONS / name
    out.mkdir(parents=True, exist_ok=True)
    glitch = name in GLITCH_ON

    master = render_icon(name, cell=1024 // (GRID_W + 2), glitch=glitch, backdrop=True)
    master = master.resize((1024, 1024), Image.NEAREST)
    master.save(out / "icon-mark-1024.png")

    transparent = render_icon(name, cell=48, glitch=glitch, backdrop=False)
    transparent.save(out / "icon-mark-transparent.png")

    (out / "icon-mark.svg").write_text(svg_icon(name))

    for s in (16, 32, 48, 180, 192, 512):
        icon_at(name, s).save(out / f"icon-{s}.png")
    icon_at(name, 256).save(out / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    # lockups, reusing the existing wordmark asset
    icon_h = render_icon(name, cell=18, glitch=glitch, backdrop=True)
    wm_h_target = icon_h.height
    wm_scaled = WORDMARK.resize(
        (round(WORDMARK.width * wm_h_target / WORDMARK.height), wm_h_target), Image.NEAREST
    )
    gap = int(icon_h.width * 0.4)
    w = icon_h.width + gap + wm_scaled.width
    h = max(icon_h.height, wm_scaled.height)
    horiz = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    horiz.paste(icon_h, (0, (h - icon_h.height) // 2), icon_h)
    horiz.paste(wm_scaled, (icon_h.width + gap, (h - wm_scaled.height) // 2), wm_scaled)
    horiz.save(out / "logo-horizontal.png")

    icon_s = render_icon(name, cell=22, glitch=glitch, backdrop=True)
    wm_s_target = int(icon_s.height * 0.55)
    wm_s = WORDMARK.resize(
        (round(WORDMARK.width * wm_s_target / WORDMARK.height), wm_s_target), Image.NEAREST
    )
    gap_s = int(icon_s.height * 0.25)
    w2 = max(icon_s.width, wm_s.width)
    h2 = icon_s.height + gap_s + wm_s.height
    stacked = Image.new("RGBA", (w2, h2), (0, 0, 0, 0))
    stacked.paste(icon_s, ((w2 - icon_s.width) // 2, 0), icon_s)
    stacked.paste(wm_s, ((w2 - wm_s.width) // 2, icon_s.height + gap_s), wm_s)
    stacked.save(out / "logo-stacked.png")


for concept_name in GRIDS:
    build_option(concept_name)
    print(f"built {concept_name}")

print("\nTree:")
for opt_dir in sorted(OPTIONS.iterdir()):
    print(f"{opt_dir.name}/")
    for f in sorted(opt_dir.iterdir()):
        print(f"  {f.name}")
