# 2026–2027 season import package (generated)

**Status:** Repository-ready · PROD partially installed · verify live before paste  
**Worker:** Worker 2 — season intake closeout (2026-08-10)  
**Operator index:** [`docs/season-launch/2026-2027/README.md`](../../season-launch/2026-2027/README.md)

## What this folder is

Canonical **install/reference package** for Shooting Challenge `2026-2027`. It combines:

- **PROD as-installed** week record IDs (RCC export 2026-08-05)
- **Canonical target** week plan (generator: Early Bird 2027-04-25 → Week 9 ends 2027-06-30)
- **Config snapshot** excerpts (2026-07-24)
- **Field mappings** for Fillout reopen

This is **not** a blind re-import. Most Program Instance / Config / Week rows **already exist** in PROD. Use this package to validate, reconcile discrepancies, and execute Schmidt tests.

## Key record IDs

| Entity | Record ID |
|--------|-----------|
| Program Instance | `rec5mEM0YPqPqq0hZ` |
| Config | `rechc1f9f4kVM1tHP` |
| Schmidt Enrollment (2026–27) | `recCyFEPeATOVNlr9` |
| Early Bird Week | `recWeVrSabnsYaHc2` |
| PWTEST hazard Week | `reci5GdxEC57vfoS3` — **deactivate before launch** |

## Files

| File | Purpose |
|------|---------|
| `season-manifest.json` | Package index + canonical plan inputs |
| `program-instance.json` | PI fields to verify |
| `challenge-config.json` | Config gaps vs 2025–26 |
| `weeks-prod-as-installed.json` | Live week dates + record IDs |
| `weeks-canonical-target.json` / `.csv` | Generator target if Mike realigns PROD |
| `week-record-id-map.json` | Quick lookup |
| `xp-reward-rules-summary.json` | 31 rules for 2026–2027 rule set |
| `level-gate-rules-status.json` | **No 2026–27 gates in snapshot — decision required** |
| `zoom-config.json` | Sparse Zoom fields + prod automation posture |
| `feature-switches.json` | Intake/email/upload switches |
| `fillout-field-mappings.json` | Enrollment mapping contract |
| `validation-report.json` | Output of offline validator |

## Validate offline

```bash
node tools/season-launch/validate-2026-2027-package.mjs
python3 -m unittest discover -s tools/enrollment-season/tests -v
node tools/challenge-year/cli.js validate-weeks --input docs/challenge-year/generated/2026-2027/weeks-canonical-target.json
```

## Known PROD vs canonical gaps

1. **Early Bird dates:** PROD has Aug 2026 test window; canonical has Apr 25–May 1 2027.
2. **Week count:** PROD has **10** numbered weeks; canonical generator uses **9** + truncated final week.
3. **Week naming:** PROD uses **Early Bird**; challenge-year docs also say **Week 0** — pick one label (SC-066).
4. **Level Gate Rules:** Snapshot has **2025–2026 only** — load 2026–2027 gates before launch.
5. **Config Zoom fields:** 2026–2027 row sparse vs 2025–2026 — copy before recording season.

## Production-only actions

See [`HANDOFF.md`](../../season-launch/2026-2027/HANDOFF.md) for ordered execution.
