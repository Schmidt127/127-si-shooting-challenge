"""Extract Version from MCP dumps without PowerShell mangling regex."""
from __future__ import annotations

import json
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
    raw = path.read_text(encoding="utf-8", errors="replace")
    # MCP dump may be pretty JSON; try parse
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # find first { 
        start = raw.find("{")
        data = json.loads(raw[start:]) if start >= 0 else {}
    # Walk for script strings
    scripts: list[str] = []

    def walk(obj):
        if isinstance(obj, dict):
            if "script" in obj and isinstance(obj["script"], str):
                scripts.append(obj["script"])
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)

    walk(data)
    versions = []
    for s in scripts:
        m = re.search(r"\* Version:\s*([0-9.]+)", s)
        if m:
            versions.append(m.group(1))
        m2 = re.search(r'version:\s*"([^"]+)"', s)
        if m2:
            versions.append("meta:" + m2.group(1))
    print(code, "scripts_found", len(scripts), "versions", versions[:8])
    if scripts:
        head = scripts[0][:500].replace("\r", "")
        print(code, "head:", head[:300])
