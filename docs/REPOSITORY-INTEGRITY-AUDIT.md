# Repository Integrity Audit — 2026-08-19 (corrected 2026-08-20)

**Status:** Active correction pass (authority rules)  
**Auditor:** Cursor (Mike-directed exhaustive integrity / truth mandate)  
**Tip audited:** `010a8b3a48917771c77ee47e53822ec736558b5b` on `master` (= `origin/master` at audit start)  
**Primary truth doc:** [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md)

Hard rules honored: no `git reset --hard`; no branch/commit deletion; no secret exposure; no invented live-system facts; fix repository-resolvable issues; label unverified claims.

---

## 0. Authority correction (2026-08-20) — obsolete `Automations` table

> **The obsolete Production `Automations` table is not an authority source and must never be used for Version 2 audits or operational decisions.**

### Retraction

Any integrity-audit or inventory conclusion that used the Production base’s **`Automations` data table** as evidence is **retracted**. That includes:

- Treating table Status `Live` / Off / retired as real Automations UI state  
- Inferring versions, triggers, ownership, Make/Gmail/Hub routing, or deployment from that table  
- Claims about Automation **077** (or any other slot) being live or off **because** that table said so  

**Example of bad evidence (do not reuse):** `docs/foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md` lists **077** as Status `Live` from the obsolete table. That does **not** prove 077 is live. Mike-dated repository documentation (Completion Master + automation-index + PKG-006) states **077 was deleted from Production on 2026-08-13** (retired Make daily-email path; Hub path is 076 → 079 → Resend). Prefer those sources and/or a fresh Automations **UI** confirmation — never the obsolete table.

### Correct authority sources going forward

1. Airtable Automations UI / current automation configuration  
2. Dated live-test evidence from Mike  
3. Current V2 repository source files  
4. Current Make.com scenario configuration and blueprints  
5. Current Communications Hub configuration  
6. Current website and deployment evidence  
7. Mike’s direct confirmation of Production behavior  

Docs/indexes may guide investigation; they must not override live evidence.

---

## 1. Git integrity

| Check | Result | Action |
|-------|--------|--------|
| On `master` | Pass | None |
| Matches `origin/master` | Pass (after `git fetch`) | None |
| Detached HEAD | Pass (not detached) | None |
| Uncommitted tracked files (start) | Pass (clean) | None |
| True merge markers | Pass | Banner `=======` lines in scripts are section dividers, not conflicts |
| Nested Git repo | Found ignored `127-si-shooting-challenge/` | Documented; left in place (history preservation; already gitignored) |
| Stale worktrees | Many local worktrees elsewhere on disk | Documented as local operator state; **not deleted** |
| Stale CONTROL.json SHA | Was `2f8188bc…` (PKG-033 baseline) | Updated canonical SHA note to current `master` tip |
| Stale PROJECT_STATE baseline SHA | Referenced older `410fa21…` | Updated to point at dynamic verify + CURRENT-TRUTH |

---

## 2. Security / PII

| Finding | Severity | Fix |
|---------|----------|-----|
| Parent emails in `prod-config-snapshot.json` (~13.7 MB) | High | Redacted to `[REDACTED_EMAIL]` |
| Parent emails in `prod-config-snapshot-2026-07-24.json` | High | Redacted |
| Parent emails in `live-probe-20260723_223805.json` | High | Redacted |
| Root `Award Recipients-Grid view from June 29 FINAL.csv` with Parent Email | High | Emails redacted; file moved to `docs/archive/sensitive/` |
| Make blueprints | Pass | Placeholders only (`REPLACE_WITH_*`, empty Bearer) |
| PAT / AWS / Resend / Tremendous live keys in tracked files | Pass | None found |
| Local `.env` / `.env.local` | Info | Present ignored only — not committed |
| Org / media / test emails | Accepted | `coach@127sportsintensity.com`, radio newsrooms, fixture `a@x.com` |

Re-scan after redaction: no remaining `@gmail.com` / `@yahoo.com` family-contact hits in tracked sensitive exports.

Full register: [`SECURITY-AND-SENSITIVE-FILES.md`](./SECURITY-AND-SENSITIVE-FILES.md).

---

## 3. Documentation contradictions reconciled

| Contradiction | Evidence-based resolution |
|---------------|---------------------------|
| README / older docs: Make+Gmail sends SC email | Current: Hub → **Resend**; Make not email sender ([`email-send-plane.md`](./integrations/email-send-plane.md)) |
| Completion Master older paste-queue vs 2026-08-19 overlays for 010/020/022/066/070b/117 | Overlays + GitHub SCRIPT versions win; older rows marked historical in CURRENT-TRUTH |
| docs/README “066 v3.2 reference” | Pattern reference is still **066**; live paste **v3.8** |
| PROJECT_STATE / CONTROL stale SHAs | Point to CURRENT-TRUTH + dynamic `git rev-parse` |
| C-025 slot 117 = Stage 17 orchestrator vs Hub handoff | Current PROD **117 = Hub handoff v2.1**; orchestrator/117a designs historical |
| Tremendous sandbox vs production | Sandbox validated; production API pending; scenario OFF |
| Softr as active front end | Obsolete / Not Used |
| Obsolete `Automations` table showed **077** Live (2026-07-23 export) | **Retracted** — table is non-authority. Mike-dated docs: **077 deleted from Production 2026-08-13**; path is 076→079→Hub→Resend |
| Living inventory GitHub versions lagged (076 v6.4, 079 missing, etc.) | **Fixed 2026-08-20** from SCRIPT headers (076 **v8.6**, 079 **v2.4**, …) |

---

## 4. Source vs documentation (spot audit)

| Automation | GitHub version | Docs / Mike overlay | Verdict |
|------------|----------------|---------------------|---------|
| 010 | v10.10 | v10.10 | Aligned |
| 020 | v3.6 | v3.6 | Aligned |
| 022 | v2.1 | v2.1 | Aligned |
| 066 | v3.8 | v3.8 | Aligned |
| 070b | v4.6 | v4.6 | Aligned |
| 076 | v8.6 | Hub daily queue (inventory refreshed) | GitHub aligned; PROD paste `UNVERIFIED` in UI |
| 077 | v5.0 archive | **Deleted from Production** (2026-08-13 docs) | Aligned — obsolete-table “Live” **retracted** |
| 079 | v2.4 | Hub dispatcher | GitHub aligned; PROD paste `UNVERIFIED` in UI |
| 117 | v2.1 | v2.1 Hub handoff | Aligned (filename still historical “to-make”; behavior is Hub queue) |

Other inventory rows remain intentionally UNKNOWN for live ON/OFF until Mike Automations **UI** confirmation. Do not fill those gaps from the obsolete `Automations` data table.

---

## 5. Blueprints

| Blueprint | Environment | Status |
|-----------|-------------|--------|
| `upload-asset-engine-lambda-prod-v1.template.json` | PROD template | Active template; secrets placeholders |
| `upload-asset-engine-v2-with-file-hash-duplicate-check.json` | Upload | Keep; token placeholder |
| `upload-asset-engine-v1.json` / `fresh-airtable-v2-base.json` | Upload | Historical / alternate |
| `awards-send-tremendous-sandbox-reward-v2.json` | Sandbox | Current implementation snapshot; OFF |
| `awards-send-tremendous-sandbox-reward-v1.json` | Sandbox | Historical |
| `c025-117f-…template.json` | DEV email historical | Retired for email |

---

## 6. Validation results

Recorded at end of this audit session. See §9 for exact commands and outcomes.

---

## 7. What remains unverified

- Live Airtable **Automations UI** ON/OFF for most automations without 2026-08-19 overlays (never infer from obsolete `Automations` data table)  
- Live Vercel project settings  
- Live Make schedule toggles beyond documented claims  
- Tremendous production API approval  
- Perfect Week final award  
- That open PR branches are still intended for merge  

---

## 8. Artifacts produced / updated

### 2026-08-19 integrity pass
1. [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) — **created**  
2. This file — **created**  
3. [`ARCHIVED-AND-SUPERSEDED-FILES.md`](./ARCHIVED-AND-SUPERSEDED-FILES.md) — **created**  
4. [`SECURITY-AND-SENSITIVE-FILES.md`](./SECURITY-AND-SENSITIVE-FILES.md) — **created**  
5. Pointers in README, AGENTS.md, docs/README.md, AUTHORITY-MAP.md, PROJECT_STATE.md, CONTROL.json  
6. PII redacted exports + archive move  

### 2026-08-20 authority correction
1. CURRENT-TRUTH / AUTHORITY-MAP / this audit — obsolete `Automations` table ban + **077** retraction  
2. Living inventory GitHub version refresh; **077** marked deleted from Production  
3. Foundation-reset 2026-07-23 inventory marked **non-authority**  
4. Hard-blocked tools that queried the obsolete Automations table  
5. Email send plane / PROJECT_STATE / automation-index / ARCHIVED index updated  

---

## 9. Tests and checks (final verification 2026-08-19)

| Suite | Result |
|-------|--------|
| `git fetch` + `master` == `origin/master` (pre-change tip `010a8b3…`) | **PASS** at audit start |
| True merge markers (`<<<<<<<`) | **PASS** (none) |
| Family-contact email re-scan on redacted exports | **PASS** (none remaining) |
| JSON parse of redacted overnight snapshots + CONTROL.json | **PASS** |
| `node tools/validate-v2-release-readiness.js` | **PASS** (1 WARN: known-issues 066 harness mention) |
| `web`: lint, typecheck, vitest (227), build | **PASS** |
| `python -m unittest` in `lambda/upload-asset` | **PASS** (139 tests) |
| `python -m unittest` in `tools/enrollment-season` | **PASS** (18 tests) |
| `python -m unittest` in `tools/airtable` | **FAIL** (5 failures, 2 errors) — stale version assertions (e.g. 118 expects `v1.1`, source is `v2.0`); **pre-existing contract drift**, not introduced by PII redaction |
| `node tools/testing/run-agent4-suite.js` | **21 passed / 8 failed / 29 total** after this audit’s validator/fixture/header fixes (was 18/11). Remaining failures are **pre-existing** email/Make/source-key contract drift listed below |

### Remaining Agent 4 failures (not fixed this pass — require dedicated packages)

| Failure | Likely cause |
|---------|----------------|
| was-email / v2-engine / 072-074 helpers | Scripts moved to Hub/Resend; tests still expect Make `074` Sent?/webhook phrasing |
| c011-weekly-email-schedule | 118 source is **v2.0**; tests still assert **v1.1** |
| agent4-xp-dedupe-matrix | Threshold writer numbering vs automation **035** |
| xp-date-normalization (057) | Denver date-key contract vs current 057 source |
| source-key-registry | Registry missing/outdated prefixes |
| upload-make-lambda-response (070b) | Test forbids `setTimeout`/poll helpers that may exist in v4.6 |

### Live confirmation still required

Airtable **Automations UI** ON/OFF for non-overlay automations (never the obsolete `Automations` data table); Vercel env; Make schedules; Tremendous production API; Perfect Week final award.