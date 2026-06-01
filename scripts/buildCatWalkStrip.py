from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "assets" / "animation" / "cat_animation_5.png"
OUT = ROOT / "public" / "assets" / "animation" / "cat_walk_strip.png"

# Detected via row-scan (non-black pixels) on cat_animation_5.png.
# These correspond to the 7 main walk frames (y0..y1 inclusive).
FRAME_BANDS = [
    (73, 237),
    (275, 431),
    (466, 623),
    (657, 815),
    (856, 1007),
    (1044, 1199),
    (1238, 1391),
]

OUT_W, OUT_H = 64, 36


def alpha_key_transparency(img: Image.Image) -> Image.Image:
    """Convert near-black background to transparent alpha."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            # Treat very dark pixels as background.
            if r <= 10 and g <= 10 and b <= 10:
                px[x, y] = (r, g, b, 0)
    return rgba


def tight_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    """Return bbox of non-transparent pixels."""
    alpha = img.split()[-1]
    return alpha.getbbox()


def main() -> None:
    src = Image.open(SRC).convert("RGBA")

    frames: list[Image.Image] = []
    for y0, y1 in FRAME_BANDS:
        band = src.crop((0, y0, src.size[0], y1 + 1))
        band = alpha_key_transparency(band)
        bbox = tight_bbox(band)
        if bbox is None:
            raise RuntimeError(f"Empty frame band {y0}-{y1}")
        cropped = band.crop(bbox)
        # Resize to output frame size using nearest-neighbor to preserve pixel art.
        frame = cropped.resize((OUT_W, OUT_H), Image.NEAREST)
        frames.append(frame)

    strip = Image.new("RGBA", (OUT_W, OUT_H * len(frames)), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.paste(frame, (0, i * OUT_H), frame)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUT)
    print(f"Wrote {OUT} ({strip.size[0]}x{strip.size[1]})")


if __name__ == "__main__":
    main()

