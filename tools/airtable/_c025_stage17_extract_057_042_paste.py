"""Extract Airtable-paste bodies for 057 v1.3 and 042 v3.1 (skip GitHub header)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "deploy-checklists"

SPECS = [
    (
        ROOT
        / "airtable"
        / "automations"
        / "shooting-challenge"
        / "057-achievements-and-milestones-calculate-perfect-week-eligibility.js",
        OUT_DIR / "C-025-stage17-057-perfect-week-v1.3-PASTE.txt",
        "1.3",
    ),
    (
        ROOT
        / "airtable"
        / "automations"
        / "shooting-challenge"
        / "042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js",
        OUT_DIR / "C-025-stage17-042-level-gates-v3.1-PASTE.txt",
        "3.1",
    ),
]


def extract(src: Path, out: Path, version_token: str) -> None:
    text = src.read_text(encoding="utf-8")
    marker = "/************************************************************"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit(f"docblock marker missing in {src.name}")
    body = text[idx:]
    out.write_text(body, encoding="utf-8", newline="\n")
    print(
        f"{src.name}: lines={len(body.splitlines())} bytes={len(body.encode())} "
        f"has_version={version_token in body} attendees_write={'Attendees\": true' in body} "
        f"-> {out.name}"
    )


def main() -> None:
    for src, out, ver in SPECS:
        extract(src, out, ver)


if __name__ == "__main__":
    main()
