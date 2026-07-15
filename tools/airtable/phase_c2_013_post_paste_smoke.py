#!/usr/bin/env python3
"""Phase C2 post-paste live DEV smoke — combined 013 (111 still ON).

Sets PHASE_C2_POST_PASTE=1 and runs the shared suite with post-paste output paths.
Does NOT retire 111. Does not touch 117, Folder 07 OFF, or PROD.
"""

from __future__ import annotations

import os
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUITE = ROOT / "tools/airtable/phase_c2_013_live_smoke_suite.py"

if __name__ == "__main__":
    os.environ["PHASE_C2_POST_PASTE"] = "1"
    raise SystemExit(runpy.run_path(str(SUITE), run_name="__main__"))
