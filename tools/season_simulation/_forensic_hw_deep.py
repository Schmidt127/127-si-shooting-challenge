"""Deep-dive homework + threshold + streak gaps for Perfect athlete."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
sys.stdout.reconfigure(encoding="utf-8")

from season_simulation.airtable_client import AirtableClient, fields_of

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
ENROLL = "rec9pIjQFyKwgAJLG"
c = AirtableClient(allow_writes=False)
reg = json.loads(
    (ROOT / "run_registries" / f"{RUN}__athlete1-perfect.json").read_text(encoding="utf-8")
)

# Homework completions
hw_ids = (reg.get("ids_by_table") or {}).get("Homework Completions") or []
print("HW count", len(hw_ids))
hw_rows = []
for hid in hw_ids:
    f = fields_of(c.get_record("Homework Completions", hid))
    row = {
        "id": hid,
        "Outcome": f.get("Outcome") or f.get("Status") or f.get("Homework Outcome"),
        "Submission Date": f.get("Submission Date") or f.get("Completed Date") or f.get("Date"),
        "Week": f.get("Week"),
        "Week End": f.get("Week End Date"),
        "PHA": f.get("Program Homework Assignment") or f.get("Homework Assignment"),
        "XP Eligible": f.get("Homework XP Eligible?") or f.get("XP Eligible?"),
        "Late": f.get("Late Status") or f.get("Late?"),
        "PW Eligible": f.get("Perfect Week Homework Eligible?")
        or f.get("Counts for Perfect Week?"),
        "Name": f.get("Name") or f.get("Homework Completion Name"),
    }
    # keep interesting
    for k, v in f.items():
        if any(
            x in k.lower()
            for x in (
                "outcome",
                "date",
                "week",
                "late",
                "xp",
                "perfect",
                "status",
                "satisf",
                "due",
                "submit",
            )
        ):
            row[k] = v
    hw_rows.append(row)
    print(
        hid,
        "outcome=",
        row.get("Outcome"),
        "sub=",
        row.get("Submission Date"),
        "late=",
        row.get("Late"),
        "xpElig=",
        row.get("XP Eligible"),
        "pw=",
        row.get("PW Eligible"),
    )

# Which HW have XP events?
xp = c.list_records("XP Events", formula=f"{{Enrollment Record ID}} = '{ENROLL}'")
hw_xp_keys = []
for r in xp:
    f = fields_of(r)
    sk = str(f.get("Source Key") or "")
    if sk.startswith("HOMEWORK_XP") or "Homework" in str(f.get("XP Source") or ""):
        hw_xp_keys.append(sk)
print("HW XP keys", len(hw_xp_keys))
for k in hw_xp_keys:
    print(" ", k)

# Threshold XP by week
th = []
for r in xp:
    f = fields_of(r)
    src = str(f.get("XP Source") or "")
    if "Threshold" in src:
        th.append(
            {
                "id": r["id"],
                "source": src,
                "key": f.get("Source Key"),
                "xp": f.get("Active XP Points") or f.get("XP Points"),
                "was": f.get("Weekly Athlete Summary"),
                "week": f.get("Week"),
                "date": f.get("XP Activity Date"),
            }
        )
print("Threshold events", len(th))
for t in sorted(th, key=lambda x: str(x.get("date"))):
    print(t)

# Streak events + occurrences
st = []
for r in xp:
    f = fields_of(r)
    src = str(f.get("XP Source") or "")
    if "Streak" in src:
        st.append(
            {
                "source": src,
                "key": f.get("Source Key"),
                "xp": f.get("Active XP Points") or f.get("XP Points"),
                "date": f.get("XP Activity Date"),
            }
        )
print("Streak XP", len(st))
for s in sorted(st, key=lambda x: str(x.get("date"))):
    print(s)

try:
    streaks = c.list_records(
        "Streak Occurrences", formula=f"{{Enrollment Record ID}} = '{ENROLL}'"
    )
except Exception as e:
    streaks = []
    print("streak list err", e)
print("Streak occurrences", len(streaks))
for s in streaks:
    f = fields_of(s)
    print(
        s["id"],
        {k: f.get(k) for k in f if any(x in k.lower() for x in ("streak", "key", "day", "name", "threshold", "end", "status"))},
    )

# Enrollment longest streak fields
enr = fields_of(c.get_record("Enrollments", ENROLL))
for k, v in enr.items():
    if "streak" in k.lower():
        print("ENR", k, "=", v)

# Map WAS by date range from daily detail
was_ids = (reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or []
print("\nWAS labeled:")
for wid in was_ids:
    f = fields_of(c.get_record("Weekly Athlete Summary", wid))
    detail = str(f.get("Perfect Week Daily Check Detail") or "")
    first = detail.split("\n")[0] if detail else ""
    print(
        wid,
        "elig=",
        f.get("Perfect Week Eligible?"),
        "hwA=",
        f.get("Perfect Week Homework Assigned Count"),
        "hwS=",
        f.get("Perfect Week Homework Satisfactory Count"),
        "status=",
        f.get("Perfect Week Automation Status"),
        "|",
        first,
    )

Path(ROOT / "reports" / f"forensic-hw-deep-{RUN}.json").write_text(
    json.dumps({"homework": hw_rows, "hw_xp": hw_xp_keys, "thresholds": th, "streaks": st}, indent=2, default=str),
    encoding="utf-8",
)
print("done")
