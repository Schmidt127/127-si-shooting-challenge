"""Confirm 053/076/101 versions from latest MCP dumps."""
from __future__ import annotations

import json
import re
from pathlib import Path

FILES = {
    "053": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\df45df07-73b8-4273-9ec6-de722650e133.txt"
    ),
    "076": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\8c92dc46-ac64-466e-80ea-28d6ee9b3dde.txt"
    ),
    "101": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\5ffacfab-31fc-44e3-aee0-d4110410c2a9.txt"
    ),
}

for code, path in FILES.items():
    data = json.loads(path.read_text(encoding="utf-8"))
    scripts: list[str] = []

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("script"), str):
                scripts.append(o["script"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(data)
    s = scripts[0].replace("\r\n", "\n")
    m = re.search(r"\* Version:\s*([v0-9.]+)", s)
    m2 = re.search(r'version:\s*"([^"]+)"', s)
    print(code, "docblock", m.group(1) if m else None, "SCRIPT.version", m2.group(1) if m2 else None)
