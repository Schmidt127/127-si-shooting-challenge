# JR Ref — audit extension scripts

Read-only audits for **127SI - JR REF**. Dry-run by default.

## Planned audits (add as `.js` files)

| Script | Purpose |
|--------|---------|
| `audit-fillout-participant-parity.js` | Fillout-linked fields populated; no orphan rows |
| `audit-mentor-assignment-coverage.js` | Participants without mentor where required |
| `audit-team-game-links.js` | Teams linked to scheduled games |

Copy structure from `extension-scripts/audits/` (Shooting Challenge) when implementing.
