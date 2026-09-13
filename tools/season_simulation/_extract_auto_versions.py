"""Extract Version: headers from MCP get_automation dumps (read-only)."""
from __future__ import annotations

import re
from pathlib import Path

FILES = {
    "053": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\db0dda02-5f41-450c-b937-70da12efbe8e.txt"
    ),
    "076": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\1f481512-0d80-41ec-bad9-8d53977ef0cb.txt"
    ),
    "101": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\c872d81b-0de5-4d71-827c-3a5dd39aee1e.txt"
    ),
}

for code, path in FILES.items():
    text = path.read_text(encoding="utf-8", errors="replace")
    versions = re.findall(r"\* Version: ([0-9.]+)", text)
    script_versions = re.findall(r'version:\s*"?(v?[0-9.]+)"?', text)
    # Prefer first docblock Version after production header
    print(
        {
            "code": code,
            "docblock_versions": versions[:5],
            "script_meta_versions": script_versions[:10],
            "has_v56": "Version: 5.6" in text or 'version: "5.6"' in text or "version: 5.6" in text,
            "has_v815": "Version: 8.15" in text or "v8.15" in text,
            "has_v69": "Version: 6.9" in text or "v6.9" in text,
        }
    )
