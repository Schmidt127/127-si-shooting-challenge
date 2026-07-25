# Lead rebase — Agent 2 onto current master

**Date:** 2026-07-25  
**Base master:** `c6103e38bc9afe02144c4ddf54620eab0a1c00f6`  
**Method:** Reset go-live to master; cherry-pick `058c2d1` + `55795ed` (did **not** keep prior tip `63a0d89`)  
**Branch tip:** see `git rev-parse HEAD` on `integration/go-live-promotion-2026-07-24`

## 119 functional proof (before paste instructions)

Diff vs master v1.4 is **non-functional**:

- Docblock / GitHub header (schedules ON wording)
- `CONFIG.version` `v1.4` → `v1.5` (+ `versionDate` / `lastUpdated`)
- Unused `weeks.weekCode` in CONFIG field list (fetched via `Object.values` but never read in matching logic)

**Arming logic unchanged.** Do **not** require Mike to paste 119 for Live season. Paste **118 v1.5** only (required). Set 119 inputs `dryRun=false` regardless.

## Conflicts resolved (master authority + Agent 2 facts)

| File | Resolution |
|------|------------|
| `CHANGELOG.md` | Kept Agent 5 / RCC / Season Launch / Agent 4 entries; prepended Agent 2 v1.5 + data-model continuation |
| `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | Kept dashboard reconciliation + SC-032 Season Launch + SC-038/039 Complete; layered 118 v1.5 / ownership / optional 119 |
| `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` | Season inputs for 118 (v1.5 required); 119 inputs with optional paste note |

## Preserved from Agent 2

118 v1.5 Live arming; data-model pack (Week Key/Code/Name, PROD attestation, sent-field ownership, WAS creators, levels, HC identity, Fillout checklist); field-contracts + was-email + c011 tests.

## Rejected / not restored

- Prior go-live tip `63a0d89` (direct merge of unrebased tip)
- Agent 2 demotion of SC-032 to Planned / SC-038–039 status downgrades that would overwrite master
- Any “118/119 should be OFF” guidance
