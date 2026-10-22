#!/usr/bin/env python3
"""Reproduce the approved Apex Golf AI launcher at Android and PWA sizes.

The checked-in WEBP is an optimized rendition of the image approved by the user.
Every APK derives its launcher artwork from this one source.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "public" / "apex-launcher.webp"
assert source.exists(), "Approved Apex launcher artwork is missing"
with Image.open(source) as image:
    icon = image.convert("RGB")
    assert icon.width == icon.height, "Apex icon must be square"
    for filename, size in [
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("app-icon-180.png", 180),
    ]:
        dest = ROOT / "public" / filename
        icon.resize((size, size), Image.Resampling.LANCZOS).save(
            dest, format="PNG", optimize=True
        )
        print(f"Created {dest.name} from approved design, {size}px")
