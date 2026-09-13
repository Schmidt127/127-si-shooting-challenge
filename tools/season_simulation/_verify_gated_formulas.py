"""Verify live gated formulas match canonical temporary packets."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.clock_override import (  # noqa: E402
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    formula_text_has_season_sim_gate,
)
from season_simulation.same_day_contracts import (  # noqa: E402
    PERFECT_WEEK_GRACE_TEMPORARY,
    SUBMITTED_SAME_DAY_TEMPORARY,
)

# Field id -> name for normalizing live formulas
ID_TO_NAME = {
    "fldx964sodLvnCrWu": "Season Sim Test Record?",
    "fldnUvkgsPsdrowqx": "Video Upload Note",
    "fldyxzwotgqRhHIPC": "Season Sim Clock Now",
    "fldpkkSBsx8kQRZos": "Activity Date",
    "fldD5fW93bsK42pPR": "Season Sim Test Submitted At",
    "fld7JJ7neI0YYmB7i": "Submitted At",
    "fldIb6nJu5TBkUUrD": "Perfect Week Manual Exception?",
    "fld1gQ2c04pndnTKe": "Count This Submission?",
}


def normalize(text: str) -> str:
    out = text
    for fid, name in ID_TO_NAME.items():
        out = out.replace("{" + fid + "}", "{" + name + "}")
    # Airtable stores \\: as \\\\ in JSON sometimes already decoded
    out = out.replace("\\\\:", "\\:")
    return " ".join(out.split())


def main() -> None:
    schema_path = Path(sys.argv[1])
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    fields = {f["id"]: f for f in data["tables"][0]["fields"]}
    live = {
        "Activity Date Is Future?": fields["fldyFAjhbfaC4LlPb"]["config"]["formula"],
        "Submitted Same Day?": fields["fldE7G8H1O7HPYuIi"]["config"]["formula"],
        "Perfect Week Grace Eligible?": fields["fldLo2GO5aac6tPX1"]["config"]["formula"],
    }
    canonical = {
        "Activity Date Is Future?": GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
        "Submitted Same Day?": SUBMITTED_SAME_DAY_TEMPORARY,
        "Perfect Week Grace Eligible?": PERFECT_WEEK_GRACE_TEMPORARY,
    }
    report = {}
    all_ok = True
    for name, live_f in live.items():
        live_n = normalize(live_f)
        can_n = normalize(canonical[name])
        ok = live_n == can_n
        if not ok:
            # Grace formula may differ only on escape of HH\:mm
            ok = live_n.replace("\\:", ":") == can_n.replace("\\:", ":")
        gated = formula_text_has_season_sim_gate(live_f) or (
            "Season Sim" in live_f or "fldx964sodLvnCrWu" in live_f
        )
        report[name] = {
            "exact_match_normalized": ok,
            "season_sim_gate_present": gated,
            "live_len": len(live_f),
            "canonical_len": len(canonical[name]),
        }
        all_ok = all_ok and ok and gated
    print(json.dumps({"all_ok": all_ok, "fields": report}, indent=2))
    if not all_ok:
        for name, live_f in live.items():
            print("---", name)
            print("LIVE:", normalize(live_f)[:400])
            print("CANON:", normalize(canonical[name])[:400])


if __name__ == "__main__":
    main()
