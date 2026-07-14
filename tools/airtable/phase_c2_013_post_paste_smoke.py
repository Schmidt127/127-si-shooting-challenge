#!/usr/bin/env python3
"""Phase C2 post-paste live DEV smoke — combined 013 (111 still ON).

Run only after Mike pastes 013 v3.0.0. Confirms blank-only GB repair,
create/link, no overwrite, duplicate prevention, adjacent 113/114/070b.

Does NOT retire 111. Does not touch 117, Folder 07 OFF, or PROD.
"""

from __future__ import annotations

# Reuse the live suite — same fixture path; callers invoke with POST_PASTE=1 for labeling.
import os
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUITE = ROOT / "tools/airtable/phase_c2_013_live_smoke_suite.py"

if __name__ == "__main__":
    os.environ["PHASE_C2_POST_PASTE"] = "1"
    # Point outputs at post-paste paths by patching module constants after load is hard;
    # instead exec and then rename is fragile — duplicate thin wrapper that imports main
    # after adjusting paths inside the suite when env set.
    ns = runpy.run_path(str(SUITE), run_name="__not_main__")
    # Override output paths then call main
    ns["OUT"] = ROOT / "docs/audits/phase-c2-013-post-paste-smoke-2026-07-14.json"
    ns["RESULT_MD"] = ROOT / "docs/overnight-runs/results/S25-phase-c2-post-paste-smoke-result.md"
    raise SystemExit(ns["main"]())
