#!/usr/bin/env python3
"""Build SEND-READY zip for one or all newspaper final-packets."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

from media_paths import newspaper_packets

ROOT = newspaper_packets()
ZIP_DOCX = [
    "01 Article - Main Version.docx",
    "02 Article - Short Version.docx",
    "04 Photo Captions.docx",
]


def build_zip(packet_dir: Path) -> dict:
    zip_path = ROOT / f"{packet_dir.name}-SEND-READY.zip"
    photos_dir = packet_dir / "Photos"
    missing = [fn for fn in ZIP_DOCX if not (packet_dir / fn).exists()]
    if missing:
        return {"packet": packet_dir.name, "ok": False, "error": f"missing: {missing}"}

    photo_count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn in ZIP_DOCX:
            zf.write(packet_dir / fn, arcname=fn)
        if photos_dir.is_dir():
            for photo in sorted(photos_dir.glob("*.jpg")):
                zf.write(photo, arcname=f"Photos/{photo.name}")
                photo_count += 1

    return {
        "packet": packet_dir.name,
        "ok": True,
        "zip": str(zip_path.resolve()),
        "photos_in_zip": photo_count,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("packet", nargs="?", help="Packet folder name (default: all missing SEND-READY)")
    args = parser.parse_args()

    if args.packet:
        targets = [ROOT / args.packet]
    else:
        targets = [
            p
            for p in sorted(ROOT.iterdir())
            if p.is_dir() and not (ROOT / f"{p.name}-SEND-READY.zip").exists()
        ]

    results = [build_zip(t) for t in targets]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
