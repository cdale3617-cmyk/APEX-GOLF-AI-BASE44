#!/usr/bin/env python3
"""Prepare the Capacitor Android project for Apex Golf AI before Gradle builds it.

Keeps the original React/Base44 app untouched. The native shell contains the
actual Vite-built project rather than a demo website or unrelated activity.
"""
from pathlib import Path
from PIL import Image
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "android" / "app" / "src" / "main"
MANIFEST = APP / "AndroidManifest.xml"
assert MANIFEST.is_file(), "Capacitor Android project was not generated"
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
android = "{http://schemas.android.com/apk/res/android}"
document = ET.parse(MANIFEST)
manifest = document.getroot()
existing = {el.attrib.get(android + "name")
            for el in manifest.findall("uses-permission")}
permissions = (
    "android.permission.INTERNET",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.WAKE_LOCK",
)
for name in permissions:
    if name not in existing:
        manifest.insert(0, ET.Element("uses-permission", {android+"name": name}))
# The app can still install on tablets without a camera or GPS sensor.
for feature in ("android.hardware.camera", "android.hardware.location.gps"):
    if not any(e.attrib.get(android+"name")==feature for e in manifest.findall("uses-feature")):
        manifest.insert(0, ET.Element("uses-feature", {
            android+"name": feature,
            android+"required": "false",
        }))
document.write(MANIFEST, encoding="utf-8", xml_declaration=True)

res = APP / "res"
# Remove the generic Capacitor adaptive launcher so Android uses the
# project icon at every screen density.
for p in (res / "mipmap-anydpi-v26").glob("ic_launcher*.xml"):
    p.unlink()
src = ROOT / "public" / "icon-512.png"
assert src.exists(), "Apex launcher icon missing"
original = Image.open(src).convert("RGBA")
for suffix, pixel_size in (
    ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
    ("xxhdpi", 144), ("xxxhdpi", 192)
):
    folder = res / ("mipmap-" + suffix)
    folder.mkdir(exist_ok=True)
    resized = original.resize((pixel_size, pixel_size), Image.Resampling.LANCZOS)
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        resized.save(folder / name)

print("Permissions and Apex launcher icon configured for Android")
