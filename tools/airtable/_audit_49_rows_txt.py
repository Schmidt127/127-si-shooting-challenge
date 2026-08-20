import json
from pathlib import Path
rows = json.loads(Path("docs/audits/_scratch-2026-08-20-automations/deep-summary.json").read_text(encoding="utf-8"))
out = []
for r in rows:
    out.append(
        f"{r['key']:5} {r['status']:4} {r['at_ver'] or '-':8} {r['repo_ver'] or '-':8} "
        f"{r['match'][:22]:22} {r['formatted']:18} {r['name'][:70]}"
    )
Path("docs/audits/_scratch-2026-08-20-automations/all-rows.txt").write_text("\n".join(out), encoding="utf-8")
print("off:", [r for r in rows if r["status"] != "Live"])
print("match_logic:", [r["key"] for r in rows if r["match"].startswith("MATCH")])
print("no_repo:", [r["key"] for r in rows if r["match"] == "NO_REPO"])
print("legacy:", [(r["key"], r["formatted"]) for r in rows if r["formatted"] != "V2 standard"])
