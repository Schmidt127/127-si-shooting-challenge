"""Extract Airtable-paste body for 117 orchestrator (skip GitHub header)."""
from pathlib import Path

SRC = Path("airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js")
OUT = Path("docs/deploy-checklists/C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt")

src = SRC.read_text(encoding="utf-8")
marker = "/************************************************************"
idx = src.find(marker)
if idx < 0:
    raise SystemExit("docblock marker missing")
body = src[idx:]
OUT.write_text(body, encoding="utf-8", newline="\n")
print(f"lines={len(body.splitlines())} bytes={len(body.encode())}")
print(f"has_v1_1_0={'v1.1.0' in body}")
print(f"has_attendees_config={'attendees: \"Attendees\"' in body}")
print(f"WROTE {OUT}")
