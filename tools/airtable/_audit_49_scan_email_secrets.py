#!/usr/bin/env python3
"""Scan automation scripts for parent-email Make/Gmail paths and obvious secrets."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "airtable/automations/shooting-challenge"

viol = []
sec = []
for p in sorted(ROOT.glob("*.js")):
    t = p.read_text(encoding="utf-8", errors="replace")
    name = p.name
    if name.startswith(("070a", "070b")):
        continue
    hits = []
    if re.search(r"makeWebhookUrl|hook\.us1\.make\.com", t):
        hits.append("makeWebhook")
    if "remoteFetchAsync" in t:
        hits.append("remoteFetchAsync")
    if re.search(r"gmail\.googleapis", t, re.I):
        hits.append("gmail")
    if re.search(r"api\.resend\.com", t, re.I) and not name.startswith("079"):
        hits.append("resend")
    if hits:
        viol.append((name, hits))
    if re.search(r"sk_live_[A-Za-z0-9]{10,}|sk_test_[A-Za-z0-9]{10,}", t):
        sec.append((name, "stripe"))
    if re.search(r"Bearer [A-Za-z0-9._\-]{32,}", t) and not re.search(r"Bearer \$\{", t):
        sec.append((name, "bearer"))

print("parent-email Make/Gmail/Resend violations (excl 070a/b upload):", len(viol))
for v in viol:
    print(" ", v)
print("secret-like:", sec)
