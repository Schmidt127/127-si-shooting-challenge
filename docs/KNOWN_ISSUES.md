# Known issues — Shooting Challenge

**Canonical register** as of **2026-08-19** (`master` at last doc pass).  
Supersedes scattered notes in the legacy [known-issues.md](./known-issues.md) pointer file for day-to-day ops.

**Companions:** [PROJECT_STATE.md](./PROJECT_STATE.md) · [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

> **Live base (Mike 2026-08-19):** Production only — `appn84sqPw03zEbTT`.  
> **Email:** Communications Hub → Resend ([email-send-plane.md](./integrations/email-send-plane.md)).

---

## Critical

_None open in repository evidence as of this refresh._
(Season intake is closed; video Lambda path is PROD-complete; no Sev-1 production outage is recorded here.)

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| — | — | — | Re-classify upward if a live outage is confirmed |

---

## High

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| K-H1 | **066** version is **v3.8** in Production (Mike 2026-08-19). Optional live OMNI sandbox confirmation may still be open if not already done. | Mike + OMNI | Confirm only if still operationally necessary. Version string itself is no longer unknown. |
| K-H2 | Most automation live versions still **UNKNOWN** in inventory (beyond reconciled rows) | Mike (UI) + Cursor (docs) | Fill [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) from Airtable UI |
| K-H3 | Full athlete E2E matrix largely **Untested** in docs | Mike + Testing | Execute [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md) on **Production** controlled fixtures |
| K-H4 | Softr dual-run (historical) — **Obsolete / Not Used**; `/shoot` is the active public UI | — | Historical Reference Only: [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md); Season Launch uses [WEB-SEASON-ACTIVATION.md](./challenge-year/WEB-SEASON-ACTIVATION.md) |

---

## Medium

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| K-M1 | **C-025** recording **XP** writer — Stage 17 orchestrator / 117a–c are **not** PROD slot 117. Slot **117 = Hub email handoff v2.1** (Mike 2026-08-19). Recording `ZOOM_CREDIT` still has no live Airtable writer under 117. | Mike + Agent A | Keep email 117 as Hub queue; any future recording XP needs a **new** attested slot — never overwrite 117 |
| K-M2 | **C-011** weekly email — **Historical Make/Gmail E2E 2026-07-24**. Current send plane is Hub → Resend; Make is not the email sender. | Mike | Keep historical packet; do not re-enable Make Gmail |
| K-M3 | **070a** homework S3 upload **PROD intentionally OFF** | Mike | Keep OFF — [AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md) |
| K-M4 | C-020 / homework+video XP after coach review not fully covered in Production harness | Testing | Extend Production scenarios beyond intake |
| K-M5 | Web **dashboard / athlete profiles** still mock; no participant auth | Agent B / web | Auth design first; do not publish private data |
| K-M6 | `/shoot/admin` is placeholder — no staff auth; diagnostics must not leak PII | Agent B | Follow [web/docs/admin-roadmap.md](../web/docs/admin-roadmap.md); read-only + gated only |
| K-M7 | Publish gate still named **`OK to Publish on Softr`** while Softr is Obsolete | Mike / schema wave | Rename via SC-144; not an active Softr dependency |
| K-M8 | `airtable/schema/current/` hand maps **partially stale**; latest PROD snapshot is **`prod-20260819/`** (`20260819_184903`) | Cursor | Full table/field hand inventory still open; use snapshot + [SCHEMA-REFRESH-2026-08-19.md](./deploy-checklists/SCHEMA-REFRESH-2026-08-19.md) for live schema |
| K-M9 | Homework library cutover **in progress** — `Lesson Key` + `Week Lkp` deleted; 033 v4.2 paste + remaining library schedule-field deletes open | Mike | [HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md](./deploy-checklists/HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md) |

---

## Low

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| K-L1 | Root marketing URL (`/`) depends on landing hub or redirect | Landing repo | Confirm `hoopchallenges-landing` home; `/shoot` already works |
| K-L2 | Automation GitHub trigger headers often say *confirm in Airtable* | Agent A | Verify triggers in UI before PROD debug |
| K-L3 | Stage I/J achievement XP + legacy field cleanup still in progress | Mike + audits | Continue per [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| K-L4 | Sitewide `noindex` blocks SEO until Mike approves indexing | Mike | Remove only after SC-115 approval (no Softr cutover gate) |
| K-L5 | Horizontal product nav can hide items on small screens (scroll) | Agent B | Keep keyboard/scroll usable; consider overflow affordance later |
| K-L6 | Untracked recovery material exists in **other** local checkouts — must not be committed blindly | Mike | Follow [UNTRACKED-RECOVERY-TRIAGE.md](./UNTRACKED-RECOVERY-TRIAGE.md) |

---

## Accepted exceptions (not bugs)

| Item | Notes |
|------|-------|
| Video / homework `not_ready_for_xp` | Retakes, pending review, do-not-award, testing rows |
| Riley W8 video XP at 25 points | Correct per program rules |
| Automation UI names ≠ GitHub filenames | Confirm in Airtable when debugging |

---

## Closed (do not re-open without new evidence)

| ID | Item | Closed |
|----|------|--------|
| — | Wave 0 close-out (C-001, C-002, C-003, C-008, media outreach) | 2026-07-05 |
| — | H-001 090F audit fix | 2026-07-05 |
| — | H-002 066 v3.2 GitHub + Production paste | 2026-07-06 (sandbox confirm still open → K-H1) |
| — | C-013 PROD video Lambda upload path | 2026-07-11 |
| — | PRs #25 / #26 / #27 merge to master | 2026-07-16 |
| — | PR #38 migration-safety reconcile on master | 2026-07-18 (`3ec489a`) |

Obsolete ChatGPT recovery package notes and offline CONTROL.json run state are **not** duplicated here.
