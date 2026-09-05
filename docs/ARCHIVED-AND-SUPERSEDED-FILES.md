# Archived and Superseded Files

**Status:** Active index  
**Last updated:** 2026-09-05  
**Current truth:** [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md)

This index explains what is historical vs current. Historical evidence is **preserved**. It must not be treated as live configuration.

> **Obsolete Production `Automations` table:** Not an authority source. Never use for V2 audits or operational decisions. See [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) and [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md).

---

## Label legend

| Label | Meaning |
|-------|---------|
| **Current** | Use for decisions today |
| **Historical** | Preserve as evidence of a past state |
| **Superseded** | Replaced by a newer design or paste; keep for archaeology |
| **Archived** | Moved under `docs/archive/` (or equivalent) |
| **Retired** | Must not be re-enabled without a new approved package |

---

## Moves performed this audit (2026-08-19)

| Before | After | Label |
|--------|-------|-------|
| `/Award Recipients-Grid view from June 29 FINAL.csv` | `docs/archive/sensitive/Award-Recipients-Grid-view-from-June-29-FINAL-REDACTED.csv` | Archived + email-redacted |

---

## Sensitive historical exports (emails redacted in place)

| Path | Label | Notes |
|------|-------|-------|
| `docs/overnight/config-xp/prod-config-snapshot.json` | Historical | Parent emails → `[REDACTED_EMAIL]`; see `SENSITIVITY-NOTICE.md` |
| `docs/overnight/config-xp/prod-config-snapshot-2026-07-24.json` | Historical | Same |
| `docs/overnight/communications/results/live-probe-20260723_223805.json` | Historical | Same |

---

## Current vs superseded authorities

| Concern | Current | Superseded / historical |
|---------|---------|---------------------------|
| Project current state | [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md) | Dated overnight “CURRENT-*-BASELINE” packets; older reconciliation tips |
| Release status narrative | [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) | Dated `docs/prod-completion/**` packets (evidence only) |
| Email delivery | [`integrations/email-send-plane.md`](./integrations/email-send-plane.md) | Make→Gmail weekly architecture; Make 117f packets |
| Tremendous | [`integrations/tremendous-award-fulfillment.md`](./integrations/tremendous-award-fulfillment.md) | v1 blueprint + older Make notes |
| Live automation ON/OFF / versions | Airtable **Automations UI** + Mike attestation + GitHub SCRIPT | **Obsolete Production `Automations` data table** (never authority); [`foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md`](./foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md) |
| Automation **077** | **Deleted from Production** (2026-08-13 docs); Hub path 076→079 | Obsolete-table “Live” row; Make daily-email send |
| Automation **117** | Hub handoff **v2.1** | Stage 17 orchestrator designs; S16 117a/117b; Make 117f |
| Automation **022** | **v2.1** | 2026-08-16 packet’s v2.0 claim (path evidence only) |
| Automation **020** | **v3.6** | Earlier v3.5 install evidence |
| Automation **021** Phase A combined paste | Live **v2.0** attachment-status only (aligned with GitHub) | [`archive/phase-a-021-combined/PHASE-A-021-combined-v1.0.0-PASTE.txt`](./archive/phase-a-021-combined/PHASE-A-021-combined-v1.0.0-PASTE.txt) — **proposed/historical; never installed**; do not paste; 006 stays retired ([`audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md`](./audits/VERSION-AUDIT-CORRECTION-021-013-067-20260905.md)) |
| Automation **070b** | **v4.6** | C-013 v4.4 E2E (historical proof of prior route) |
| Automation **066** | **v3.8** | v3.2/v3.3/v3.4/v3.5 era wording |
| Automation **010** | **v10.10** | PKG-006R v10.8/v10.9 paste-queue rows |
| Softr front end | Obsolete | Softr cutover checklists (reference only) |
| Domain | `fairfieldbasketballclub.com` | Legacy `hoopchallenges.com` URLs in old evidence |

---

## Nested / local (not source of truth)

| Path / artifact | Label | Action |
|-----------------|-------|--------|
| `127-si-shooting-challenge/` (nested clone) | Local ignored | Do not edit; optional Mike delete later |
| `chatgpt-recovery-2026-07-14/` | Local ignored | Covered by UNTRACKED-RECOVERY-TRIAGE |
| External git worktrees | Local operator | Do not confuse with `master` |
| `web/.env.local`, `tools/airtable/.env` | Local secrets | Never commit |

---

## Make blueprints

| File | Label |
|------|-------|
| `awards-send-tremendous-sandbox-reward-v2.json` | Current implementation snapshot (not production-live) |
| `awards-send-tremendous-sandbox-reward-v1.json` | Historical / superseded by v2 |
| `c025-117f-zoom-recording-approval-email-dev-v1.template.json` | Retired for email |
| Upload engine templates | Active templates with placeholders |

---

## Prior cleanup audits (still useful)

| Doc | Role |
|-----|------|
| [`audits/ORPHAN-AND-REPOSITORY-CLEANUP-AUDIT-2026-08-16.md`](./audits/ORPHAN-AND-REPOSITORY-CLEANUP-AUDIT-2026-08-16.md) | Branch/orphan inventory — tip SHA now historical vs current master |
| [`audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md`](./audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md) | Earlier truth audit — superseded by CURRENT-TRUTH for git identity |
| [`audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md`](./audits/SECURITY-PRIVACY-AUDIT-2026-07-21.md) | Earlier security pass — complemented by 2026-08-19 redactionsactions files |

When those audits cite an old tip SHA, treat the SHA as the audit’s evidence tip, not today’s `master`.
