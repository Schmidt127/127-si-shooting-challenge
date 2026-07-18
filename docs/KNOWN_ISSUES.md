# Known issues — Shooting Challenge

**Canonical register** as of **2026-07-18** (master `3ec489a`).  
Supersedes scattered notes in the legacy [known-issues.md](./known-issues.md) pointer file for day-to-day ops.

**Companions:** [PROJECT_STATE.md](./PROJECT_STATE.md) · [V2_RELEASE_CHECKLIST.md](./V2_RELEASE_CHECKLIST.md) · [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md)

> Status below is **repository + documented ops evidence**. Confirm live Airtable / Make / Vercel before treating any item as closed.

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
| K-H1 | **066 v3.2** live OMNI sandbox still unconfirmed (script already pasted DEV + PROD) | Mike + OMNI | Run [066-dev-omni-confirmation-packet.md](./deploy-checklists/066-dev-omni-confirmation-packet.md); do not mark complete without live evidence |
| K-H2 | Most automation DEV/PROD live versions still **UNKNOWN** in inventory | Mike (UI) + Agent A (docs) | Fill [AUTOMATION_VERSION_INVENTORY.md](./AUTOMATION_VERSION_INVENTORY.md) from Airtable UI |
| K-H3 | Full athlete E2E matrix largely **Untested** in docs | Mike + Testing | Execute [V2_END_TO_END_TEST_MATRIX.md](./V2_END_TO_END_TEST_MATRIX.md) on DEV |
| K-H4 | Softr + Next.js **dual public surface** — participants may hit either system | Mike | Complete [SOFTR-CUTOVER-READINESS.md](./deploy-checklists/SOFTR-CUTOVER-READINESS.md) before hard cutover; keep `noindex` until approved |

---

## Medium

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| K-M1 | **C-025** Zoom recording credit — repo ready (117a/b), **not installed** in live DEV/PROD; Perfect Week / Total Zoom / post-award gaps open | Mike + Agent A | Follow [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](./v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md); leave PROD untouched |
| K-M2 | **C-011** automatic weekly email — repo ready (118/119), schedules **must stay OFF**; Make webhook live-blocked | Mike | DEV paste only when authorized; keep manual 072→074 path |
| K-M3 | **070a** homework S3 upload **PROD intentionally OFF** | Mike | Keep OFF — [AUTOMATION_070A_LAUNCH_DECISION.md](./v2/AUTOMATION_070A_LAUNCH_DECISION.md) |
| K-M4 | C-020 / homework+video XP after coach review not fully covered in DEV harness | Testing | Extend DEV scenarios beyond intake |
| K-M5 | Web **dashboard / athlete profiles** still mock; no participant auth | Agent B / web | Auth design first; do not publish private data |
| K-M6 | `/shoot/admin` is placeholder — no staff auth; diagnostics must not leak PII | Agent B | Follow [web/docs/admin-roadmap.md](../web/docs/admin-roadmap.md); read-only + gated only |
| K-M7 | Publish gate still named **`OK to Publish on Softr`** while Softr is being replaced | Mike / schema wave | Keep field until rename wave; cutover checklist tracks successor |
| K-M8 | `airtable/schema/current/` **stale**; latest dated snapshot is `prod-20260706` / `dev-20260706` | Agent A | Refresh schema exports; do not edit `current/` from Agent B |

---

## Low

| ID | Issue | Owner | Next action |
|----|-------|-------|-------------|
| K-L1 | Root marketing URL (`/`) depends on landing hub or redirect | Landing repo | Confirm `hoopchallenges-landing` home; `/shoot` already works |
| K-L2 | Automation GitHub trigger headers often say *confirm in Airtable* | Agent A | Verify triggers in UI before PROD debug |
| K-L3 | Stage I/J achievement XP + legacy field cleanup still in progress | Mike + audits | Continue per [airtable/stage-j-legacy-cleanup.md](./airtable/stage-j-legacy-cleanup.md) |
| K-L4 | Sitewide `noindex` blocks SEO until cutover | Mike | Remove only after Softr cutover sign-off |
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
| — | H-002 066 v3.2 GitHub + DEV/PROD paste | 2026-07-06 (sandbox confirm still open → K-H1) |
| — | C-013 PROD video Lambda upload path | 2026-07-11 |
| — | PRs #25 / #26 / #27 merge to master | 2026-07-16 |
| — | PR #38 migration-safety reconcile on master | 2026-07-18 (`3ec489a`) |

Obsolete ChatGPT recovery package notes and offline CONTROL.json run state are **not** duplicated here.
