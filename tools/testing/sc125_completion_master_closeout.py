from pathlib import Path

path = Path("docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md")
text = path.read_text(encoding="utf-8")
replacements = {
    "- Public Homework catalog/detail is PHA-first in repository source; #125 remains open only for final production runtime verification.":
    "- Public Homework catalog/detail is **PHA-first and Production-runtime verified**; issue #125 is closed Completed. Live Fairfield proof confirms 19 active PHA rows resolve to 18 schedulable assignments with one deterministic Week 1 / HW1 duplicate, unassigned published curriculum fails closed, and assigned detail pages use the PHA Week/slot.",
    "Closed Completed: **#56, #98, #100, #103, #118, #120**.  ":
    "Closed Completed: **#56, #98, #100, #103, #118, #120, #125**.  ",
    "Still live-proof dependent: **#101, #102, #104, #105, #121, #125, #126**.":
    "Still live-proof dependent: **#101, #102, #104, #105, #121, #126**.",
}
for old, new in replacements.items():
    if text.count(old) != 1:
        raise SystemExit(f"Expected exactly one Completion Master match for: {old}")
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("SC-125 Completion Master closeout applied")
