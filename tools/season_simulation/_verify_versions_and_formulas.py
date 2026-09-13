"""Confirm 076/101 Production Version lines and extract live formulas."""
from __future__ import annotations

import json
import re
from pathlib import Path

AUTO = {
    "076": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\1f481512-0d80-41ec-bad9-8d53977ef0cb.txt"
    ),
    "101": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\c872d81b-0de5-4d71-827c-3a5dd39aee1e.txt"
    ),
}

for code, path in AUTO.items():
    data = json.loads(path.read_text(encoding="utf-8"))
    scripts = []

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
    s = scripts[0]
    # Normalize newlines
    s2 = s.replace("\r\n", "\n")
    for line in s2.splitlines()[:80]:
        if "Version" in line or "version" in line or "lastUpdated" in line or "SCRIPT" in line:
            print(code, line[:120])
    # SCRIPT block
    m = re.search(r"const SCRIPT\s*=\s*\{([\s\S]*?)\};", s2)
    if m:
        print(code, "SCRIPT block:", m.group(1)[:300].replace("\n", " | "))

# Formulas from list_tables dump
schema = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\1a351db1-f918-4a9b-b9fc-aabd4f71e8bf.txt"
)
# File may be truncated / not pure JSON - search for formula fields by name
text = schema.read_text(encoding="utf-8", errors="replace")
for field in (
    "Activity Date Is Future?",
    "Submitted Same Day?",
    "Perfect Week Grace Eligible?",
):
    # find "name": "Field" then look ahead for formula
    idx = text.find(f'"name": "{field}"')
    print("\n===", field, "idx", idx)
    if idx < 0:
        continue
    chunk = text[idx : idx + 2500]
    # options.formula
    m = re.search(r'"formula"\s*:\s*"((?:\\.|[^"\\])*)"', chunk)
    if not m:
        # maybe multiline differently
        print(chunk[:800])
        continue
    formula = bytes(m.group(1), "utf-8").decode("unicode_escape")
    print("LIVE FORMULA LEN", len(formula))
    print(formula[:600])
    print("---END SNIP---")
    # gate markers
    print(
        {
            "has_Season_Sim_Test": "Season Sim Test Record?" in formula
            or "Season Sim" in formula,
            "has_SEASON_SIM": "SEASON-SIM|" in formula,
            "has_Clock_Now": "Season Sim Clock Now" in formula,
            "has_NOW": "NOW()" in formula,
            "has_TODAY": "TODAY()" in formula,
        }
    )
