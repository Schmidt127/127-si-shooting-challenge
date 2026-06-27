#!/usr/bin/env python3
"""Extract Fresh Airtable v2 blueprint from agent transcript and apply hash lookup patch."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TRANSCRIPT = (
    Path(r"C:\Users\mschmidt_fairfield\.cursor\projects")
    / "c-Users-mschmidt-fairfield-Documents-GitHub-127-si-shooting-challenge"
    / "agent-transcripts"
    / "e66cd234-df93-4fb6-82b3-0740af41726a"
    / "e66cd234-df93-4fb6-82b3-0740af41726a.jsonl"
)
LINE_MARKER = "Fresh Airtable Source - v2"
BODY_MARKER = '"name": "Shooting Challenge - GAME - Upload Engine - Fresh Airtable Source - v2"'
BASE = REPO / "make" / "blueprints" / "upload-asset-engine-fresh-airtable-v2-base.json"
OUT = REPO / "make" / "blueprints" / "upload-asset-engine-v2-with-file-hash-duplicate-check.json"
PATCH = REPO / "tools" / "make" / "patch_upload_engine_v2_hash_lookup.py"


def extract_blueprint() -> str:
    text = TRANSCRIPT.read_text(encoding="utf-8")
    for line in reversed(text.splitlines()):
        if LINE_MARKER not in line or "gateway:CustomWebHook" not in line:
            continue
        obj = json.loads(line)
        for part in obj.get("message", {}).get("content", []):
            if part.get("type") != "text":
                continue
            body = part.get("text", "")
            if "<user_query>" in body:
                body = body.split("<user_query>", 1)[1].strip()
            start = body.find("{")
            if start >= 0 and BODY_MARKER in body:
                return body[start:].strip()
    raise SystemExit(f"Could not find v2 blueprint in {TRANSCRIPT}")


def load_patch_module():
    spec = importlib.util.spec_from_file_location("patch_mod", PATCH)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    raw = extract_blueprint()
    json.loads(raw)  # validate
    BASE.write_text(raw, encoding="utf-8")
    patch_mod = load_patch_module()
    patched = patch_mod.patch_blueprint(json.loads(raw))
    OUT.write_text(json.dumps(patched, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")

    content = OUT.read_text(encoding="utf-8")
    checks = {
        "name_ok": "With File Hash Duplicate Check" in patched["name"],
        "no_search_52": "airtable:ActionSearchRecords" not in content,
        "http_52": "http:ActionSendData" in content,
        "records_ref": "52.records[1].id" in content,
        "no_cloned_paths": content.count('"module": "google-drive:uploadAFile"') == 2,
    }
    print(f"Wrote {BASE}")
    print(f"Wrote {OUT}")
    for key, ok in checks.items():
        print(f"{key}: {'OK' if ok else 'FAIL'}")
    if not all(checks.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
