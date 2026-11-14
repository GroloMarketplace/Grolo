"""Generate Capacitor splash assets from the official Grolo artwork.

Source: src/assets/Native Grolo Splash Screen (2732 x 2732 px).png

- iOS: Splash.imageset keeps three 2732x2732 PNGs (1x/2x/3x slots, all full
  resolution, matching the previous convention).
- Android: each drawable*/splash.png is composited at that bucket's exact
  pixel size using aspect-fill (cover) centering, matching the iOS
  LaunchScreen storyboard's scaleAspectFill behavior.

Requires Pillow:  python -m pip install Pillow
"""

from pathlib import Path
import shutil

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src" / "assets" / "Native Grolo Splash Screen (2732 x 2732 px).png"
IOS_SPLASH_DIR = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"

# drawable bucket -> (width, height) of the splash.png it replaces.
ANDROID_TARGETS = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}

IOS_FILENAMES = [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
]


def cover_fit(source: Image.Image, width: int, height: int) -> Image.Image:
    """Scale to cover the target canvas, then center-crop the overflow."""
    sw, sh = source.size
    scale = max(width / sw, height / sh)
    resized = source.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def main() -> None:
    artwork = Image.open(SOURCE).convert("RGB")
    if artwork.size != (2732, 2732):
        raise SystemExit(f"Unexpected source size {artwork.size}; expected (2732, 2732)")

    for name in IOS_FILENAMES:
        shutil.copyfile(SOURCE, IOS_SPLASH_DIR / name)
        print(f"iOS  -> {IOS_SPLASH_DIR / name}")

    for bucket, (width, height) in ANDROID_TARGETS.items():
        target = ANDROID_RES / bucket / "splash.png"
        if not target.parent.is_dir():
            continue
        cover_fit(artwork, width, height).save(target, "PNG")
        print(f"Android -> {target} ({width}x{height})")


if __name__ == "__main__":
    main()
