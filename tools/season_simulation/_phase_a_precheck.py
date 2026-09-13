"""Phase A pre-execute checks for fresh SC-001 run."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient  # noqa: E402
from season_simulation.clock_override import formula_text_has_season_sim_gate  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402

AUTO_DUMPS = {
    "053": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\0f59c6ac-3fcd-4598-96e4-f21b5b64f081.txt"
    ),
    "076": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\c644c3e5-369f-4941-b04c-5e0ec364e606.txt"
    ),
    "101": Path(
        r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\8ded123d-183e-4349-b99a-73f037fe69b5.txt"
    ),
}
FAILED_TOKEN = "20260912T222521Z"
FAILED_ENROLL = [
    "rec9pIjQFyKwgAJLG",
    "recjZLSqtwvewN2Pn",
    "rectTQCRGIaK4W0IF",
]


def _version(path: Path) -> str | None:
    data = json.loads(path.read_text(encoding="utf-8"))
    scripts: list[str] = []

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("script"), str):
                scripts.append(o["script"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(data)
    s = scripts[0].replace("\r\n", "\n")
    m = re.search(r"\* Version:\s*([v0-9.]+)", s)
    return m.group(1) if m else None


def main() -> None:
    versions = {k: _version(p) for k, p in AUTO_DUMPS.items()}
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    residue = {"xp": {}, "subs": 0, "email": 0}
    for eid in FAILED_ENROLL:
        rows = c.list_records(
            "XP Events",
            formula=f"FIND('{eid}', {{Source Key}} & '')",
            max_records=5,
        )
        residue["xp"][eid] = len(rows)
    residue["subs"] = len(
        c.list_records(
            "Submissions",
            formula=f"FIND('{FAILED_TOKEN}', {{Video Upload Note}} & '')",
            max_records=5,
        )
    )
    residue["email"] = len(
        c.list_records(
            "Email Handoff Queue",
            formula=f"FIND('{FAILED_TOKEN}', {{Recipients JSON}} & '')",
            max_records=5,
        )
    )
    print(
        json.dumps(
            {
                "versions": versions,
                "versions_ok": versions
                == {"053": "5.6", "076": "v8.15", "101": "v6.9"}
                or versions == {"053": "v5.6", "076": "v8.15", "101": "v6.9"}
                or (
                    str(versions.get("053")).lstrip("v") == "5.6"
                    and versions.get("076") == "v8.15"
                    and versions.get("101") == "v6.9"
                ),
                "residue": residue,
                "residue_zero": all(v == 0 for v in residue["xp"].values())
                and residue["subs"] == 0
                and residue["email"] == 0,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
