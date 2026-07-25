#!/usr/bin/env python3
"""Scan newspaper final-packets for SEND-READY zip and placeholder text."""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path

from media_paths import newspaper_packets

ROOT = newspaper_packets()


def docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml").decode("utf-8", errors="ignore")
    text = re.sub(r"<[^>]+>", " ", xml)
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    report = []
    for pkt in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        issues = []
        for docx in sorted(pkt.glob("*.docx")):
            try:
                text = docx_text(docx)
                if "PASTE FINAL" in text or "PLACEHOLDER" in text:
                    issues.append(f"{docx.name}: placeholder")
            except Exception as exc:
                issues.append(f"{docx.name}: read error ({exc})")
        for txt in sorted(pkt.glob("*.txt")):
            if "PASTE FINAL" in txt.read_text(encoding="utf-8", errors="ignore"):
                issues.append(f"{txt.name}: placeholder")
        photos = list((pkt / "Photos").glob("*.jpg")) if (pkt / "Photos").is_dir() else []
        send_ready = (ROOT / f"{pkt.name}-SEND-READY.zip").exists()
        with_photos = list(ROOT.glob(f"{pkt.name}*.zip"))
        report.append(
            {
                "packet": pkt.name,
                "send_ready_zip": send_ready,
                "other_zips": [z.name for z in with_photos if z.name != f"{pkt.name}-SEND-READY.zip"],
                "photo_count": len(photos),
                "issues": issues,
            }
        )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
