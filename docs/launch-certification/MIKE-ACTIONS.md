# Launch Certification — Mike Actions (minimal)

> **Historical snapshot — do not execute as the current operator packet.**
> This 2026-07-25 checklist includes superseded versions and a legacy domain;
> use the Completion Master and current package operator packets instead.

**Authority:** Final Launch Closure Lead  
**Date:** 2026-07-25  
**Scope:** Authenticated UI only. No code paste unless version drift found.  
**Canonical prior queue:** [`docs/next-wave/go-live/MIKE-ACTIONS.md`](../next-wave/go-live/MIKE-ACTIONS.md)

Do **not** disable 118/119 based on older OFF docs.

---

## P0 — reconfirm only (exact UI)

| # | Action | Where | Done when |
|---|--------|-------|-----------|
| L1 | Confirm **074** `sendMode` / `sendModeInput` is **Live** (or blank + WAS Live), not fixed **Test** | Airtable → Automations → 074 → Script inputs | Written OK |
| L2 | Confirm **118** schedule **ON** Sun **5:00 AM** America/Denver | Automations → 118 | Toggle ON |
| L3 | Confirm **119** schedule **ON** Sun **10:00 AM** America/Denver | Automations → 119 | Toggle ON |
| L4 | Confirm **118** inputs: `dryRun=false`, `sendMode=Live`, `includeSchmidt=false` | 118 → Script inputs | All three match |
| L5 | Confirm **119** input: `dryRun=false` | 119 → Script inputs | dryRun false |
| L6 | Confirm Make **`Weekly Athlete Summary - Bulk Email - May 18`** is **ON** | Make.com | Scenario ON |
| L7 | Confirm **072** and **074** automation toggles **ON** | Airtable Automations | Both ON |

## P0 — merge + post-merge (Mike authorization required for merge)

| # | Action | Where | Done when |
|---|--------|-------|-----------|
| L8 | Confirm Vercel production READY on new master tip | Vercel → project | Deploy READY; SHA matches master |
| L9 | Public smoke https://www.hoopchallenges.com/shoot | Browser | Home + one list route load |
| L10 | Health check `GET /shoot/api/airtable` | Browser or curl | `{ ok: true, airtable: { tokenValid: true } }` |
| L11 | Merge **PR #42** after review (explicit auth) | GitHub → #42 | Merged to master |

## P1 — quick attests (write OK / FAIL)

| # | Action | Done when |
|---|--------|-----------|
| L12 | **112 OFF** | Written attest |
| L13 | **070a OFF** | Written attest |
| L14 | **063 / 111** deleted or OFF | Written attest |
| L15 | Exactly one of **117 / 117c** ON for Zoom credit XP | Written attest |
| L16 | Optional header spot-check: **118 v1.5**, 072 v4.0, 074 v2.1, 066 v3.3, 054 v5.6 | Match repo |

## P1 — Fillout season (if enrollment reopen soon)

Follow [FILLOUT-CERTIFICATION.md](./FILLOUT-CERTIFICATION.md) F1–F8. Not required to flip weekly-email launch if intake stays closed.

## Explicit non-actions

1. Do **not** turn 118/119 OFF.  
2. Do **not** force 074 `sendMode=Test` permanently.  
3. Do **not** set `includeSchmidt=true` with `sendMode=Live` on 118.  
4. Do **not** enable 070a or 112.  
5. Do **not** create a second Make weekly-email scenario.  
6. Do **not** delete remote Git branches without separate auth.  
7. Do **not** treat Softr as a gate.