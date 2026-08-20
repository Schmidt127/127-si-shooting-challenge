#!/usr/bin/env python3
"""Compare Production Automations table (Name/Status/Code) to repo scripts."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MCP_DUMP = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127-si-shooting-challenge\agent-tools\e50ed3b6-532e-4b7f-97b0-9afc5b91d80f.txt"
)
OUT = ROOT / "docs" / "audits" / "_scratch-2026-08-20-automations"
OUT.mkdir(parents=True, exist_ok=True)

NAME = "fldMhjKTBKMIoeAyV"
STATUS = "fldFyBz0VojhWkT3B"
CODE = "fld96jSyTpKQUvsNL"


def status_name(v) -> str:
    if v is None:
        return ""
    if isinstance(v, dict):
        return str(v.get("name") or v.get("id") or v)
    return str(v)


def extract_version(code: str) -> str:
    if not code:
        return ""
    m = re.search(r'version:\s*["\'](v?[\d.]+)["\']', code)
    if m:
        return m.group(1) if m.group(1).startswith("v") else "v" + m.group(1)
    m = re.search(r"\*\s*Version:\s*(v?[\d.]+)", code)
    if m:
        return m.group(1) if m.group(1).startswith("v") else "v" + m.group(1)
    m = re.search(r"Version:\s*(v?[\d.]+)", code)
    if m:
        return m.group(1) if m.group(1).startswith("v") else "v" + m.group(1)
    return ""


def extract_num(name: str) -> str:
    m = re.match(r"^(\d{3})\b", name.strip())
    return m.group(1) if m else ""


def normalize_code(code: str) -> str:
    lines = code.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(l.rstrip() for l in lines).strip() + "\n"


def strip_github_header(code: str) -> str:
    c = code.replace("\r\n", "\n").replace("\r", "\n")
    if c.lstrip().startswith("/*"):
        end = c.find("*/")
        if end != -1:
            header = c[: end + 2]
            rest = c[end + 2 :].lstrip("\n")
            if any(
                x in header
                for x in (
                    "GitHub Source of Truth",
                    "Last GitHub Update",
                    "Source: Airtable Automation",
                    "GitHub header",
                )
            ):
                return rest
    return c


def after_ts(c: str) -> str:
    i = c.find("// @ts-nocheck")
    return c[i:] if i >= 0 else c


def email_path_flags(code: str, name: str) -> str:
    flags = []
    cl = code.lower()
    hub_queue = "Email Handoff Queue" in code
    has_fetch = bool(re.search(r"\bfetch\s*\(", code))
    remote = "remoteFetchAsync" in code
    make_webhook = bool(re.search(r"makeWebhookUrl|hook\.us1\.make\.com", code, re.I))
    gmail_api = bool(re.search(r"gmail\.googleapis", code, re.I))
    resend_direct = bool(re.search(r"api\.resend\.com|resend\.com/emails", code, re.I))
    is_079 = name.strip().startswith("079") or "Send to Communications Hub" in name

    if is_079 and has_fetch and "communications" in cl:
        return "Hub→Resend (079 dispatcher)"
    if make_webhook:
        flags.append("MAKE_WEBHOOK")
    if gmail_api:
        flags.append("GMAIL")
    if resend_direct:
        flags.append("RESEND_DIRECT")
    if remote:
        flags.append("REMOTE_FETCH")
    if has_fetch and not is_079:
        if "communications" in cl or "ingest" in cl:
            flags.append("FETCH_HUB_FROM_NON_079")
        else:
            flags.append("FETCH_OTHER")
    if flags:
        return "VIOLATION: " + ",".join(flags)
    if hub_queue and not is_079:
        return "Queue→079→Hub→Resend"
    return "N/A (non-email)"


def main() -> None:
    data = json.loads(MCP_DUMP.read_text(encoding="utf-8"))
    records = data["records"]

    repo_dir = ROOT / "airtable" / "automations" / "shooting-challenge"
    repo_by_num: dict[str, list] = {}
    for p in repo_dir.glob("*.js"):
        m = re.match(r"^(\d{3})-", p.name)
        if not m:
            continue
        num = m.group(1)
        text = p.read_text(encoding="utf-8")
        repo_by_num.setdefault(num, []).append(
            {
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "version": extract_version(text),
                "code": text,
                "name": p.name,
            }
        )

    rows = []
    for rec in records:
        cells = rec["cellValuesByFieldId"]
        name = cells.get(NAME) or ""
        status = status_name(cells.get(STATUS))
        code = cells.get(CODE) or ""
        num = extract_num(name)
        at_ver = extract_version(code)

        safe = re.sub(r"[^\w\-]+", "_", name)[:80]
        (OUT / f"{num or 'xxx'}_{safe}.js").write_text(
            code.replace("\r\n", "\n"), encoding="utf-8"
        )

        repo_list = repo_by_num.get(num, [])
        repo_ver = repo_list[0]["version"] if repo_list else ""
        repo_path = repo_list[0]["path"] if repo_list else ""
        match = "NO_REPO"
        if repo_list:
            at_body = normalize_code(strip_github_header(code))
            best = None
            for r in repo_list:
                repo_body = normalize_code(strip_github_header(r["code"]))
                if at_body == repo_body:
                    best = "EXACT_BODY"
                    break
                if after_ts(at_body) == after_ts(repo_body):
                    best = "MATCH_AFTER_TS"
                    break
                ha = hashlib.sha256(after_ts(at_body).encode()).hexdigest()[:12]
                hr = hashlib.sha256(after_ts(repo_body).encode()).hexdigest()[:12]
                if ha == hr:
                    best = "HASH_MATCH_AFTER_TS"
                    break
                # Compare ignoring indentation-only by collapsing whitespace runs in logic? keep differ detail
                best = best or (
                    f"DIFFER len_at={len(at_body)} len_repo={len(repo_body)} "
                    f"hash_at={ha} hash_repo={hr}"
                )
            match = best or "DIFFER"

        # deeper: SCRIPT block only
        script_at = re.search(r"const SCRIPT\s*=\s*\{[\s\S]*?\};", code)
        script_repo = None
        if repo_list:
            script_repo = re.search(
                r"const SCRIPT\s*=\s*\{[\s\S]*?\};", repo_list[0]["code"]
            )
        script_match = ""
        if script_at and script_repo:
            script_match = (
                "SCRIPT_SAME"
                if normalize_code(script_at.group(0)) == normalize_code(script_repo.group(0))
                else "SCRIPT_DIFF"
            )

        v2_markers = sum(
            [
                "SECTION 1: SCRIPT METADATA" in code or "SECTION 1: SCRIPT" in code,
                "const SCRIPT" in code,
                "async function main" in code,
                "setOutputSafe" in code,
                "debugStep" in code,
            ]
        )
        formatted = (
            "V2-ish" if v2_markers >= 4 else ("partial" if v2_markers >= 2 else "legacy")
        )

        # safety scans
        issues = []
        if "makeWebhookUrl" in code or "hook.us1.make.com" in code:
            issues.append("make_webhook_in_code")
        if "remoteFetchAsync" in code:
            issues.append("remoteFetchAsync")
        if "117f" in code.lower():
            issues.append("117f_reference")
        if re.search(r"(sk-[A-Za-z0-9]{20,}|Bearer [A-Za-z0-9._-]{20,})", code):
            # allow Bearer ${secret} template
            if not re.search(r"Bearer \$\{", code):
                issues.append("possible_hardcoded_secret")

        rows.append(
            {
                "num": num,
                "name": name,
                "status": status,
                "at_ver": at_ver,
                "repo_ver": repo_ver,
                "repo_path": repo_path,
                "match": match,
                "script_match": script_match,
                "email_path": email_path_flags(code, name),
                "formatted": formatted,
                "code_len": len(code),
                "rec_id": rec["id"],
                "issues": issues,
            }
        )

    rows.sort(key=lambda r: (r["num"] or "999", r["name"]))
    (OUT / "summary.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")

    print(f"records={len(rows)}")
    print(f'Live={sum(1 for r in rows if r["status"] == "Live")}')
    print(f'Off={sum(1 for r in rows if r["status"] != "Live")}')
    print("Statuses:", sorted(set(r["status"] for r in rows)))
    print("format:", dict(Counter(r["formatted"] for r in rows)))
    print("match:", dict(Counter(r["match"].split()[0] for r in rows)))
    print("--- version diffs ---")
    for r in rows:
        if r["at_ver"] and r["repo_ver"] and r["at_ver"] != r["repo_ver"]:
            print(
                f"{r['num']} AT {r['at_ver']} vs REPO {r['repo_ver']} match={r['match'][:40]}"
            )
    print("--- body mismatches ---")
    for r in rows:
        if not str(r["match"]).startswith(("EXACT", "MATCH", "HASH")):
            print(
                f"{r['num']} {r['status']:6} AT={r['at_ver']:8} REPO={r['repo_ver']:8} "
                f"{r['match'][:70]} | {r['name'][:65]}"
            )
    print("--- email paths ---")
    for r in rows:
        if r["email_path"] != "N/A (non-email)":
            print(f"{r['num']} {r['email_path']} | {r['name'][:55]}")
    print("--- issues ---")
    for r in rows:
        if r["issues"]:
            print(f"{r['num']} {r['issues']} | {r['name'][:55]}")

    # nums present
    nums = [r["num"] for r in rows]
    print("nums:", ",".join(nums))
    dupes = [n for n, c in Counter(nums).items() if c > 1 and n]
    print("duplicate nums:", dupes)


if __name__ == "__main__":
    main()
