#!/usr/bin/env python3
"""Deep audit of Production Automations Name/Status/Code vs repo."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MCP = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127-si-shooting-challenge\agent-tools\e50ed3b6-532e-4b7f-97b0-9afc5b91d80f.txt"
)
OUT = ROOT / "docs" / "audits" / "_scratch-2026-08-20-automations"
OUT.mkdir(parents=True, exist_ok=True)
REPORT_JSON = OUT / "deep-summary.json"

NAME = "fldMhjKTBKMIoeAyV"
STATUS = "fldFyBz0VojhWkT3B"
CODE = "fld96jSyTpKQUvsNL"


def status_name(v) -> str:
    if v is None:
        return ""
    if isinstance(v, dict):
        return str(v.get("name") or "")
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
    return ""


def key_from_name(name: str) -> str:
    n = name.strip()
    m = re.match(r"^(\d{3}[A-Za-z]?)", n)
    return m.group(1).lower() if m else ""


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


def classify_email(code: str, name: str, key: str) -> tuple[str, list[str]]:
    issues = []
    is_079 = key == "079"
    is_upload = key in {"070a", "070b", "070c"}  # Make/Lambda asset upload — not parent email
    has_queue = "Email Handoff Queue" in code
    has_make_url = bool(re.search(r"makeWebhookUrl|hook\.us1\.make\.com", code))
    has_remote = "remoteFetchAsync" in code
    has_fetch = bool(re.search(r"\bfetch\s*\(", code))
    has_gmail = bool(re.search(r"gmail\.googleapis", code, re.I))
    has_resend = bool(re.search(r"api\.resend\.com", code, re.I))
    has_117f = "117f" in code.lower()

    if has_117f:
        issues.append("117f_reference")
    if has_gmail:
        issues.append("gmail_api")
    if has_resend and not is_079:
        issues.append("direct_resend")

    if is_upload:
        path = "Asset upload Make/Lambda (not parent email)"
        if has_make_url or has_remote:
            path += " — Make webhook present (upload plane)"
        return path, issues

    if is_079:
        if has_fetch and "communications" in code.lower():
            return "Parent email: 079 Hub dispatcher -> Resend", issues
        issues.append("079_missing_hub_fetch")
        return "079 unexpected", issues

    if has_make_url or (has_remote and ("email" in name.lower() or "webhook" in name.lower())):
        # Parent-email Make path?
        if has_queue and not has_make_url:
            pass
        elif has_make_url or has_remote:
            # Distinguish: if script only creates queue, OK
            if has_queue and not has_make_url and not has_remote:
                return "Parent email: Queue create", issues
            if has_make_url or has_remote:
                # Check if parent email send
                if re.search(r"parent|weekly summary|video feedback|homework feedback|welcome", name, re.I):
                    if "Payload to Make" in name or "Asset" in name:
                        return "Asset upload (name)", issues
                    issues.append("parent_email_make_path")
                    return "VIOLATION: parent email Make path", issues
                issues.append("make_webhook_non_upload")
                return "VIOLATION: Make webhook", issues

    if has_queue and not has_fetch and not has_remote and not has_make_url:
        return "Parent email: Queue create -> 079 -> Hub -> Resend", issues

    if has_fetch and not is_079:
        if "communications" in code.lower():
            issues.append("non_079_hub_fetch")
            return "VIOLATION: Hub fetch outside 079", issues
        issues.append("unexpected_fetch")
        return "VIOLATION: unexpected fetch", issues

    return "N/A (non-email)", issues


def v2_format_score(code: str) -> tuple[str, int]:
    if not code or len(code) < 50:
        return "empty/no-script", 0
    markers = [
        ("const SCRIPT", "SCRIPT" in code and "const SCRIPT" in code),
        ("const CONFIG", "const CONFIG" in code),
        ("async function main", "async function main" in code),
        ("setOutputSafe", "setOutputSafe" in code),
        ("debugStep", "debugStep" in code),
        ("SECTION", "SECTION" in code),
        ("@ts-nocheck", "// @ts-nocheck" in code),
        ("statusOut", "statusOut" in code),
    ]
    score = sum(1 for _, ok in markers if ok)
    if score >= 6:
        return "V2 standard", score
    if score >= 4:
        return "V2 partial", score
    return "legacy/nonstandard", score


def main() -> None:
    data = json.loads(MCP.read_text(encoding="utf-8"))
    records = data["records"]

    repo_dir = ROOT / "airtable" / "automations" / "shooting-challenge"
    repo_map: dict[str, Path] = {}
    for p in repo_dir.glob("*.js"):
        m = re.match(r"^(\d{3}[a-zA-Z]?)", p.name)
        if m:
            repo_map[m.group(1).lower()] = p

    rows = []
    for rec in records:
        cells = rec["cellValuesByFieldId"]
        name = cells.get(NAME) or ""
        status = status_name(cells.get(STATUS))
        code = (cells.get(CODE) or "").replace("\r\n", "\n")
        key = key_from_name(name)
        at_ver = extract_version(code)

        safe = re.sub(r"[^\w\-]+", "_", name)[:90]
        dump_path = OUT / f"{key or 'xxx'}_{safe}.js"
        dump_path.write_text(code, encoding="utf-8")

        repo_p = repo_map.get(key)
        repo_ver = extract_version(repo_p.read_text(encoding="utf-8")) if repo_p else ""
        repo_path = str(repo_p.relative_to(ROOT)).replace("\\", "/") if repo_p else ""

        match = "NO_REPO"
        if not code.strip() or len(code.strip()) < 50:
            match = "EMPTY_OR_MINIMAL_CODE"
        elif repo_p:
            at_body = normalize_code(strip_github_header(code))
            repo_body = normalize_code(strip_github_header(repo_p.read_text(encoding="utf-8")))
            if at_body == repo_body:
                match = "EXACT_BODY"
            elif after_ts(at_body) == after_ts(repo_body):
                match = "MATCH_LOGIC"  # github header / whitespace before ts differs
            else:
                ha = hashlib.sha256(after_ts(at_body).encode()).hexdigest()[:12]
                hr = hashlib.sha256(after_ts(repo_body).encode()).hexdigest()[:12]
                match = f"DIFFER at={ha} repo={hr} len={len(at_body)}/{len(repo_body)}"

        email_path, email_issues = classify_email(code, name, key)
        fmt, fmt_score = v2_format_score(code)

        safety = list(email_issues)
        if re.search(r"sk_live_|sk_test_[A-Za-z0-9]{10,}", code):
            safety.append("possible_stripe_key")
        if re.search(r"Bearer [A-Za-z0-9._\-]{24,}", code) and "Bearer ${" not in code and "Bearer `$" not in code:
            # template Bearer ${secret} ok
            if not re.search(r"Bearer \$\{|Bearer `\$\{", code):
                safety.append("possible_hardcoded_bearer")

        # idempotency hints for email queue creators
        has_handoff_key = "Handoff Key" in code or "handoffKey" in code
        has_source_key = "Source Key" in code or "sourceKey" in code or "SOURCE_KEY" in code

        rows.append(
            {
                "key": key,
                "name": name,
                "status": status,
                "at_ver": at_ver,
                "repo_ver": repo_ver,
                "repo_path": repo_path,
                "match": match,
                "email_path": email_path,
                "formatted": fmt,
                "fmt_score": fmt_score,
                "code_len": len(code),
                "rec_id": rec["id"],
                "safety": safety,
                "has_handoff_key": has_handoff_key,
                "has_source_key": has_source_key,
                "dump": str(dump_path.relative_to(ROOT)).replace("\\", "/"),
            }
        )

    rows.sort(key=lambda r: (re.sub(r"[a-z]", "", r["key"]).zfill(3), r["key"], r["name"]))
    REPORT_JSON.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    lines = []
    lines.append(f"total={len(rows)} live={sum(1 for r in rows if r['status']=='Live')} off={sum(1 for r in rows if r['status']!='Live')}")
    lines.append(f"match={dict(Counter(r['match'].split()[0] for r in rows))}")
    lines.append(f"format={dict(Counter(r['formatted'] for r in rows))}")
    lines.append("VERSION_DIFFS:")
    for r in rows:
        if r["at_ver"] and r["repo_ver"] and r["at_ver"] != r["repo_ver"]:
            lines.append(f"  {r['key']}: AT {r['at_ver']} vs REPO {r['repo_ver']}")
    lines.append("MISMATCHES:")
    for r in rows:
        if not r["match"].startswith(("EXACT", "MATCH")):
            lines.append(f"  {r['key']:5} {r['status']:4} {r['match'][:50]} | {r['name'][:60]}")
    lines.append("EMAIL:")
    for r in rows:
        if r["email_path"] != "N/A (non-email)":
            lines.append(f"  {r['key']:5} {r['email_path']}")
    lines.append("SAFETY:")
    for r in rows:
        if r["safety"]:
            lines.append(f"  {r['key']:5} {r['safety']}")
    lines.append("KEYS: " + ",".join(r["key"] for r in rows))
    (OUT / "deep-report.txt").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
