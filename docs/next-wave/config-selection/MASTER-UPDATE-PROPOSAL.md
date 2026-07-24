# Master Update Proposal — Year-Aware Config Selection

Agent 10 · 2026-07-24

## Proposal summary

Treat the Config table as a **year-keyed registry**, not a single global singleton. Ship a deterministic resolver, migrate consumers gradually, and **leave all four Config rows in place**.

## Correct prior overnight guidance

`docs/overnight/config-xp/MIKE-ACTIONS.md` item recommending collapse/delete of “extra” Config rows is **superseded** for this concern:

- Four rows are intentional (2025–2026 … 2028–2029).
- Max Videos 4 / 6 / 5 / 4 are intentional per-year values.
- Defect = ambiguous selection (`records[0]`, sparse-field heuristics), not row count.

Do **not** archive or delete Config rows to satisfy first-record readers.

## Recommended master-doc updates (ChatGPT / backlog owners)

| Doc / backlog | Proposed update |
|---|---|
| Overnight config-xp MIKE-ACTIONS #1 | Replace “collapse to one record” with “adopt year-aware resolver; keep four rows” |
| CURRENT-CONFIG-BASELINE §6 item 1 | Reclassify from “4 conflicting records” to “4 year-specific records; selection must be year-aware” |
| CONFIG-HARDCODE-AUDIT item 12 | Same reclassification; point to `docs/next-wave/config-selection/` |
| V2-013 Program Instance wave | Explicit dependency: Config selection uses PI / Enrollment school year |
| Completion master (out of Agent 10 edit scope) | Note Config year registry + Max Videos per year when Mike authorizes |

Agent 10 did **not** edit `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` (ownership exclusion).

## Implementation already in repo (this branch)

- `lib/config-selection/index.js`
- `tests/config-selection/resolve-config.test.js`
- Contract, inventory, 042 audit, rollout runbook under `docs/next-wave/config-selection/`

## Follow-on work (not this commit)

1. Wire tools (preview email) to resolver.
2. Year-validate Zoom Meetings Global/Program Config links (OMNI or script).
3. DEV dry-run 042 proposed guard, then paste.
4. Optional Config field for Perfect Week video minimum (replace hardcoded `3`).
5. Populate sparse future-year Config rows when those seasons go live (copy Stage 17 flags intentionally — do not assume first-row).
