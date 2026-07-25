#!/usr/bin/env python3
"""Compare DEV vs PROD automations lists (read-only). Prefer API; fall back to docs."""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
OUT = HERE / "_preview" / "c025_stage17_automation_slot_audit.json"


def load_token() -> str:
    env = {}
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env.get("AIRTABLE_API_TOKEN") or env["AIRTABLE_TOKEN"]


def api(method: str, url: str, token: str):
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:3000]}


def normalize(autos: list[dict]) -> list[dict]:
    out = []
    for a in autos:
        name = a.get("name") or ""
        nums = re.findall(r"\b(\d{2,3})\b", name)
        out.append(
            {
                "id": a.get("id"),
                "name": name,
                "isEnabled": a.get("isEnabled"),
                "status": a.get("status"),
                "numbers": nums,
            }
        )
    return out


def find_num(items: list[dict], num: str) -> list[dict]:
    return [a for a in items if num in (a.get("numbers") or []) or re.search(rf"(^|[^0-9]){num}([^0-9]|$)", a.get("name") or "")]


def main() -> None:
    token = load_token()
    report: dict = {"dev": {}, "prod": {}, "comparison": {}, "repo_evidence": []}

    for label, base in (("dev", DEV), ("prod", PROD)):
        st, body = api("GET", f"https://api.airtable.com/v0/meta/bases/{base}/automations", token)
        entry = {"list_status": st}
        if st == 200:
            autos = normalize(body.get("automations") or [])
            entry["count"] = len(autos)
            entry["automations"] = autos
            entry["enabled_count"] = sum(1 for a in autos if a.get("isEnabled") is True)
            entry["disabled_count"] = sum(1 for a in autos if a.get("isEnabled") is False)
            entry["focus_112"] = find_num(autos, "112")
            entry["focus_043"] = find_num(autos, "043")
            entry["focus_117"] = find_num(autos, "117")
            entry["focus_101"] = find_num(autos, "101")
            entry["focus_057"] = find_num(autos, "057")
            entry["focus_042"] = find_num(autos, "042")
            entry["focus_115"] = find_num(autos, "115")
            # legacy/test heuristics
            legacy = []
            for a in autos:
                n = (a.get("name") or "").lower()
                if any(
                    k in n
                    for k in (
                        "test",
                        "legacy",
                        "zzz",
                        "archive",
                        "retired",
                        "deprecated",
                        "old ",
                        "tmp",
                        "scratch",
                        "probe",
                        "dev only",
                    )
                ) or a.get("isEnabled") is False:
                    legacy.append(a)
            entry["disabled_or_legacy_named"] = legacy
        else:
            entry["error"] = body
        report[label] = entry

    # Diff by name if both readable
    if report["dev"].get("list_status") == 200 and report["prod"].get("list_status") == 200:
        dev_names = {a["name"] for a in report["dev"]["automations"]}
        prod_names = {a["name"] for a in report["prod"]["automations"]}
        report["comparison"] = {
            "only_in_dev": sorted(dev_names - prod_names),
            "only_in_prod": sorted(prod_names - dev_names),
            "shared_count": len(dev_names & prod_names),
            "dev_count": len(dev_names),
            "prod_count": len(prod_names),
        }

    # Repo evidence scan
    patterns = [
        r"112",
        r"043",
        r"slot",
        r"deleted",
        r"retired",
        r"freed",
        r"repurpose",
        r"removed automation",
    ]
    hits = []
    search_roots = [
        ROOT / "docs",
        ROOT / "airtable" / "automations",
    ]
    for root in search_roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.suffix.lower() not in {".md", ".txt", ".js", ".json"}:
                continue
            if "node_modules" in path.parts or "_preview" in path.parts:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            low = text.lower()
            if not any(
                k in low
                for k in (
                    "112",
                    "043",
                    "slot limit",
                    "automation slot",
                    "deleted automation",
                    "retired",
                    "freed a slot",
                    "free the slot",
                    "removed 112",
                    "removed 043",
                    "delete 112",
                    "delete 043",
                )
            ):
                continue
            # extract nearby lines mentioning 112/043/slot
            lines = text.splitlines()
            for i, line in enumerate(lines):
                l = line.lower()
                if any(
                    x in l
                    for x in (
                        "112",
                        "043",
                        "slot",
                        "deleted",
                        "retired",
                        "freed",
                        "repurpose",
                    )
                ) and any(
                    x in l
                    for x in (
                        "112",
                        "043",
                        "117",
                        "automation",
                        "slot",
                    )
                ):
                    snippet = " | ".join(lines[max(0, i - 1) : min(len(lines), i + 2)])
                    if len(snippet) > 400:
                        snippet = snippet[:400]
                    hits.append({"file": str(path.relative_to(ROOT)).replace("\\", "/"), "line": i + 1, "snippet": snippet})
                    if len(hits) > 80:
                        break
            if len(hits) > 80:
                break
        if len(hits) > 80:
            break
    report["repo_evidence"] = hits[:80]

    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "dev_status": report["dev"].get("list_status"),
        "prod_status": report["prod"].get("list_status"),
        "dev_count": report["dev"].get("count"),
        "prod_count": report["prod"].get("count"),
        "dev_112": report["dev"].get("focus_112"),
        "prod_112": report["prod"].get("focus_112"),
        "dev_043": report["dev"].get("focus_043"),
        "prod_043": report["prod"].get("focus_043"),
        "dev_117": report["dev"].get("focus_117"),
        "prod_117": report["prod"].get("focus_117"),
        "comparison_only_prod_sample": (report.get("comparison") or {}).get("only_in_prod", [])[:30],
        "comparison_only_dev_sample": (report.get("comparison") or {}).get("only_in_dev", [])[:30],
        "repo_hit_count": len(report["repo_evidence"]),
    }, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
