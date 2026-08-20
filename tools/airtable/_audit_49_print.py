#!/usr/bin/env python3
"""Print audit summary and deepen 070a/b/c + 078 matching."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "audits" / "_scratch-2026-08-20-automations"
rows = json.loads((OUT / "summary.json").read_text(encoding="utf-8"))

# Fix matching for lettered nums
repo_dir = ROOT / "airtable" / "automations" / "shooting-challenge"


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


# Map repo files by leading token: 070a, 078, 001, etc.
repo_map = {}
for p in repo_dir.glob("*.js"):
    m = re.match(r"^(\d{3}[a-zA-Z]?)", p.name)
    if not m:
        continue
    key = m.group(1).lower()
    repo_map[key] = p

# Also search for welcome handoff / 078
extra = list(repo_dir.glob("*welcome*")) + list(repo_dir.glob("*078*"))
print("extra welcome/078 files:", [str(p.name) for p in extra])

# Re-check NO_REPO rows
for r in rows:
    if r["match"] != "NO_REPO":
        continue
    name = r["name"]
    # derive key
    m = re.match(r"^(\d{3}[a-zA-Z]?)", name.strip())
    key = (m.group(1).lower() if m else "")
    # special 078A
    if name.strip().upper().startswith("078A"):
        key = "078a"
    code_file = OUT / f"{r['num'] or 'xxx'}_{re.sub(r'[^\\w\\-]+', '_', name)[:80]}.js"
    # find dump file
    dumps = list(OUT.glob(f"{r['num']}*.js")) if r["num"] else list(OUT.glob("xxx*.js"))
    # better: match by rec - use name start
    dump = None
    for d in OUT.glob("*.js"):
        if d.name.startswith("_"):
            continue
        # read first line name? use summary rec - load from dumps matching num prefix in name field inside summary was used for filename
        pass
    # reconstruct filename as audit script did
    safe = re.sub(r"[^\w\-]+", "_", name)[:80]
    dump = OUT / f"{r['num'] or 'xxx'}_{safe}.js"
    at_code = dump.read_text(encoding="utf-8") if dump.exists() else ""
    repo_p = repo_map.get(key)
    print("---")
    print("AT name:", name)
    print("key:", key, "repo:", repo_p.name if repo_p else None, "dump exists", dump.exists(), "len", len(at_code))
    if repo_p and at_code:
        repo_code = repo_p.read_text(encoding="utf-8")
        at_body = normalize_code(strip_github_header(at_code))
        repo_body = normalize_code(strip_github_header(repo_code))
        ha = hashlib.sha256(after_ts(at_body).encode()).hexdigest()[:12]
        hr = hashlib.sha256(after_ts(repo_body).encode()).hexdigest()[:12]
        print("versions", extract_version(at_code), extract_version(repo_code))
        print("match exact", at_body == repo_body, "after_ts", after_ts(at_body) == after_ts(repo_body), "hashes", ha, hr)
        # email safety
        for pat in ["makeWebhookUrl", "hook.us1.make.com", "remoteFetchAsync", "fetch(", "Email Handoff Queue", "api.resend"]:
            print(f"  AT has {pat}:", pat in at_code or (pat == "fetch(" and bool(re.search(r"\\bfetch\\s*\\(", at_code))))

print("\n=== ALL ROWS ===")
for r in rows:
    line = (
        f"{(r['num'] or '----'):4} {r['status']:4} "
        f"{(r['at_ver'] or '-'):8} {(r['repo_ver'] or '-'):8} "
        f"{r['match'][:18]:18} {r['formatted']:8} "
        f"{r['email_path'].replace(chr(0x2192), '->')[:36]:36} "
        f"{r['name'][:68]}"
    )
    print(line)

print("\nOff rows:")
for r in rows:
    if r["status"] != "Live":
        print(r)
