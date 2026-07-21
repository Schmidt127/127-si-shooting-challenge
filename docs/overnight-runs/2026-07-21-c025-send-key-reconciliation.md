# C-025 117f Send-Key Reconciliation — Overnight Run 2026-07-21

**Branch:** `overnight/c025-send-key-reconciliation-2026-07-21`
**Scope:** DEV / repo-only. No Airtable, Make, Gmail, webhook, env-var, production-record, or live-setting changes.
**Reconciliation commit:** `845a3c43e41545fe06e5d81af694f24de981a560`
**Report commit:** this file's commit (follows the reconciliation commit).

---

## 1. Final canonical format

```
ZOOM_REC_EMAIL|EnrollmentRID|ZoomMeetingRID|ZoomAttendanceRID
```

Exactly four components:

1. `ZOOM_REC_EMAIL` (literal prefix)
2. Enrollment Airtable record ID
3. Zoom Meeting Airtable record ID
4. Zoom Attendance Airtable record ID

Confirmed as the live-tested format built by the deployed Airtable Automation **117f**
(`117f-zoom-recording-send-approval-email.js`, `buildSendKey(enrollmentRid, zoomMeetingRid, zoomAttendanceId)`).
That live script was **not modified**.

---

## 2. Branch base note (important context)

The task asked to branch from `master`. In this repository `master` is bound to a **separate git worktree**
(`127-si-shooting-challenge-integration`) and is ~15 commits behind the active integration line, so it cannot be
checked out in this working directory. The working directory is **shared by multiple concurrent overnight agents**
that were actively switching branches during this run.

The reconciliation branch was therefore based on the current integration tip, which is `master` **plus** the
already-merged C-025 work this task depends on:
- the live **117f v1.1** four-part send-key script, and
- the concurrent **docs-cleanup** commit that added `SUPERSEDED — HISTORICAL` banners + four-part keys to most DEV docs.

Basing here (rather than on stale `master`) keeps the branch internally consistent: active code is four-part **and**
the historical DEV docs are already clearly labeled.

---

## 3. Every stale (three-part) occurrence found + classification

Search covered code, tests, fixtures, docs, sample payloads, Make helpers, blueprints, and paste packets.
Two untracked out-of-repo trees were **excluded from edits**: the nested `127-si-shooting-challenge/` duplicate copy
and `chatgpt-recovery-2026-07-14/` (both untracked recovery artifacts).

### 3a. Active code — UPDATED to four-part

| File | Occurrence | Classification | Action |
|---|---|---|---|
| `make/lib/c025-117f-make-scenario.js` | exact-equality validator + error message were three-part | **Active code** | Updated to four-part (`enrollmentRid\|zoomMeetingRid\|zoomAttendanceId`). This was a real bug: the three-part exact check would have **rejected** the live four-part 117f payload. |
| `airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.js` | `buildApprovalEmailSendKey(enrollmentId, meetingId)` built three-part; used by `evaluateApprovalEmailSendDecision` | **Active code** (exported, tested, used by a DEV fixture tool; **not** in the live orchestrator path — 117 Section F is `deferred_to_117f`) | Added `zoomAttendanceId` param → four-part; updated the call site. |

### 3b. Active tests — UPDATED to four-part

| File | Occurrence | Action |
|---|---|---|
| `make/lib/c025-117f-make-scenario.test.js` | `SEND_KEY` constant three-part | Updated to include `ZA` (four-part). |
| `airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js` | assertions expected three-part keys | Updated all to four-part; added a `blank attendance → null` assertion. |

### 3c. Fixtures / sample payloads — UPDATED to four-part

| File | Occurrence | Action |
|---|---|---|
| `make/test-payloads/c025-117f-zoom-recording-approved.sample.json` | `sendKey` three-part | Appended `\|recZoomAttend00001` (matches the payload's own `zoomAttendanceId`). |
| `docs/testing/C-025-stage17-test-fixtures.json` | `Recording Approval Email Send Key` three-part | Appended the record's own id `recTestZARecordingApproved`. |
| `docs/testing/C-025-stage17-expected-results.json` | `emailKey` invariant three-part | Updated to `...\|{zoomAttendanceRID}`. |

### 3d. Current config / manifest docs — UPDATED to four-part

| File | Occurrence | Action |
|---|---|---|
| `make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json` | Data Store `keyPattern` three-part | Updated to four-part. |
| `docs/deploy-checklists/C-025-stage17-prod-schema-manifest.json` | field `description` three-part | Updated to four-part. |

### 3e. Tracked DEV tools — UPDATED to four-part (example/expected strings only)

| File | Occurrence | Action |
|---|---|---|
| `tools/airtable/_c025_117f_reverify_dev_fixtures.py` | `canonical_send_key_happy` three-part | Appended `\|{FIXTURES['happy']['za']}`. |
| `tools/airtable/_c025_117f_prepare_dev_fixture.py` | `expected_send_key` three-part | Appended `\|{rid}` (the Zoom Attendance id already in scope). |

### 3f. Historical / superseded material — PRESERVED and clearly labeled

| File | Occurrence | Classification | Action |
|---|---|---|---|
| `docs/deploy-checklists/C-025-stage17-117f-v1.2.0-PASTE.txt` | v1.2.0 paste body uses three-part | **Superseded** (current shipped script is v1.1) | Left the historical body intact; **added a `SUPERSEDED — HISTORICAL PASTE PACKET` banner** in the header region (excluded from the paste body) noting the canonical four-part key. |
| `docs/deploy-checklists/C-025-117f-dev-agent2-evidence-2026-07-20.md` | line ~62 three-part example | **Historical evidence** | Left unchanged — already carries a `SUPERSEDED — HISTORICAL` banner explicitly noting the example is the older three-part form retained for evidence. |
| `docs/deploy-checklists/C-025-117f-dev-manual-action-sheet.md` | line ~41 three-part example | **Historical** | Left unchanged — already labeled superseded. |
| `docs/deploy-checklists/C-025-117f-dev-make-scenario-contract.md` | lines ~31/57 three-part | **Historical (v1.2.0 contract)** | Left unchanged — already labeled superseded. |

### 3g. Untracked / out-of-committed-scope — LEFT UNTOUCHED

| File | Occurrence | Reason left unchanged |
|---|---|---|
| `tools/airtable/_c025_stage17_prod_batch_deploy.py` | `email_key_format` three-part | **Untracked** production deploy tool — out of committed scope; not run (no prod access). |
| `make/blueprints/c025-117f-...-dev-v1.blueprint.json` | prefix-only `ZOOM_REC_EMAIL\|` | **Untracked**; prefix-only (not a stale three-part key). |
| `127-si-shooting-challenge/**` (nested copy), `chatgpt-recovery-2026-07-14/**` | three-part in copies of 117f/generator/tests | **Untracked** duplicate/recovery trees — not part of the repo. |

### 3h. Already-correct occurrences — NO CHANGE (verified four-part or prefix-only)

- `airtable/.../117f-zoom-recording-send-approval-email.js` (live — four-part) and its `.README.md`.
- `airtable/.../117-zoom-recording-credit-orchestrator.js` (prefix-only comment; Section F `deferred_to_117f`, never builds keys).
- `docs/deploy-checklists/C-025-117f-prod-zoom-recording-approval-email.md`, `docs/automation-index.md`,
  `docs/status/C-025-stage17-current-prod-progress.md`, `docs/deploy-checklists/C-025-stage17-formula-build-order.md`,
  `...-automation-readiness.md`, `...-automation-inputs.md`, `...-remaining-prod-work.md` (all four-part / superseded-labeled).
- `CHANGELOG.md`, `...-117-orchestrator-v1.1.1-PASTE.txt`, various checklist rows (prefix-only `ZOOM_REC_EMAIL\|`).

---

## 4. Files changed (this reconciliation)

```
airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.js
airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js
docs/deploy-checklists/C-025-stage17-117f-v1.2.0-PASTE.txt   (superseded banner only; historical body preserved)
docs/deploy-checklists/C-025-stage17-prod-schema-manifest.json
docs/testing/C-025-stage17-expected-results.json
docs/testing/C-025-stage17-test-fixtures.json
make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json
make/lib/c025-117f-make-scenario.js
make/lib/c025-117f-make-scenario.test.js
make/test-payloads/c025-117f-zoom-recording-approved.sample.json
tools/airtable/_c025_117f_prepare_dev_fixture.py
tools/airtable/_c025_117f_reverify_dev_fixtures.py
```
Plus this report: `docs/overnight-runs/2026-07-21-c025-send-key-reconciliation.md`.

## 5. Historical files left unchanged (intentional)

- `docs/deploy-checklists/C-025-117f-dev-agent2-evidence-2026-07-20.md` (already labeled superseded).
- `docs/deploy-checklists/C-025-117f-dev-manual-action-sheet.md` (already labeled superseded).
- `docs/deploy-checklists/C-025-117f-dev-make-scenario-contract.md` (already labeled superseded).
- Untracked trees: nested `127-si-shooting-challenge/`, `chatgpt-recovery-2026-07-14/`, and the untracked
  `tools/airtable/_c025_stage17_prod_batch_deploy.py` / `...blueprint.json`.

---

## 6. Tests run + results

All run locally (Node v22.16.0, Python 3.13.7). Baseline (pre-edit) and post-edit both captured.

| Suite | Command | Result |
|---|---|---|
| Make offline scenario | `node make/lib/c025-117f-make-scenario.test.js` | **PASS (18)** |
| Stage 17 zoom-attendance | `node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js` | **PASS (42)** |
| C-025 Stage 17 contracts | `python -m unittest tools.airtable.tests.test_c025_stage17_contracts` | **PASS (6)** |
| Combined zoom credit | `node .../lib/c025-stage17-combined-zoom-credit.test.js` | **PASS** |
| ETF downstream | `node .../lib/c025-stage17-etf-downstream.test.js` | **PASS** |
| Zoom recording credit | `node .../lib/c025-zoom-recording-credit.test.js` | **PASS** |
| Script header contract | `node .../lib/script-header-contract.test.js` | **PASS** |
| XP date normalization | `node .../lib/xp-date-normalization.test.js` | **PASS** |
| Misc lib suites | 066 / c011 / upload-make-lambda / v2-engine-contracts | **PASS** |
| Syntax — JS | `node --check` on edited `.js` + live 117f | **PASS** |
| Syntax — Python | `python -m py_compile` on edited tools | **PASS** |
| JSON validity | `JSON.parse` on all 5 edited JSON files | **PASS** |

pytest is not installed in this environment; `unittest` was used for the Python contract suite.
Live-Airtable / network-dependent Python tools were **not** run (no live access per DEV-only guardrails).

### Invariant checks (targeted assertions, all PASS)

- Make helper **accepts** the canonical four-part key (matches live 117f output).
- Make helper **rejects** the stale three-part key.
- **Duplicate protection** keys on the full four-part `sendKey` (identical key → duplicate; differing attendance id → not duplicate).
- **Relationship mismatch** validation still blocks Enrollment and Zoom Meeting link mismatches.
- `buildApprovalEmailSendKey` builds four-part and returns `null` when the attendance id is missing.

---

## 7. Confirmations against task requirements

- **Live Automation 117/117f behavior unchanged** — the deployed scripts were not edited (already four-part).
- **No forbidden tokens introduced** — no `TEST1`/`TEST2`, timestamps, random suffixes, or email addresses in any production key; keys use only `rec…` ids / documented placeholders.
- **Duplicate protection** = full four-part key (verified).
- **Relationship mismatch validation** for Enrollment + Zoom Meeting = intact (verified).
- **Make offline helper matches the live scenario contract** — now validates/dedupes on the four-part key produced by live 117f.

---

## 8. Remaining concerns

1. **Shared working directory / concurrency.** Multiple overnight agents operate in this same checkout and were
   switching branches during the run. The reconciliation commit is safely on the named branch, but reviewers should
   verify the branch tip before any merge.
2. **Branch base ≠ literal `master`.** See §2. The branch includes the intervening C-025 117f + docs-cleanup commits
   because `master` is worktree-locked and stale.
3. **Untracked prod tool** `_c025_stage17_prod_batch_deploy.py` still shows a three-part `email_key_format`. It is
   untracked (out of committed scope) and was intentionally not modified; flag for follow-up if it becomes tracked.
4. **Untracked duplicate trees** (`127-si-shooting-challenge/`, `chatgpt-recovery-2026-07-14/`) contain old three-part
   copies; left untouched as non-repo artifacts.

---

## 9. Final git status

See the report-commit shell output appended at close of run (tracked working tree clean for reconciliation files;
pre-existing untracked overnight artifacts remain). Branch **not** merged to `master`; **not** pushed.
