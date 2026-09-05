#!/usr/bin/env python3
import json
from pathlib import Path

EV = Path("docs/testing/evidence/transactional-purge-2026-09-05")
p = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127-si-shooting-challenge\agent-tools\2f588b48-8aac-4d61-9923-4e47ba823587.txt"
)
raw = p.read_text(encoding="utf-8")
i = raw.find("{")
data = json.loads(raw[i:])
recs = data.get("records", [])
live = off = other = 0
rows = []
for r in recs:
    cells = r.get("cellValuesByFieldId") or {}
    name = cells.get("fldMhjKTBKMIoeAyV")
    status = cells.get("fldFyBz0VojhWkT3B")
    code = cells.get("fld96jSyTpKQUvsNL")
    if isinstance(status, dict):
        status = status.get("name")
    if isinstance(code, str) and len(code) > 60:
        code = code[:60] + "..."
    rows.append({"id": r["id"], "name": name, "status": status, "code_snip": code})
    s = str(status or "").lower()
    if s == "live":
        live += 1
    elif s == "off":
        off += 1
    else:
        other += 1

out = EV / "10-automations-table-status.json"
out.write_text(
    json.dumps({"live": live, "off": off, "other": other, "rows": rows}, indent=2),
    encoding="utf-8",
)
print(f"Automations table Live={live} Off={off} Other={other} wrote {out}")

inv = json.loads((EV / "03-inventory-classification-20260905_204910.json").read_text(encoding="utf-8"))
print("totals", inv["totals"])
for n, info in sorted(
    inv["tables"].items(), key=lambda x: (-x[1]["planned_delete_count"], x[0])
):
    print(
        f"{info['classification'][:28]:28} cnt={info['record_count']:5} "
        f"del={info['planned_delete_count']:4} post={info['expected_post_purge_count']:5}  {n}"
    )

probes = json.loads((EV / "08-supplemental-probes.json").read_text(encoding="utf-8"))
print("zoom test fixtures:")
for z in probes["zoom_meetings"]:
    print(" ", z["looks_like_test_fixture"], z["id"], z["meeting_name"])
