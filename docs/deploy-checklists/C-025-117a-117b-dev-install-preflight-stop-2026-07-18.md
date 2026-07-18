# C-025 — 117a/117b DEV install preflight STOP (2026-07-18)

**Result:** **STOPPED before paste / enable / test writes**  
**Repo tip:** `origin/master` @ `4b5c91a`  
**ENV base:** `appTetnuCZlCZdTCT` (DEV) — PROD `appn84sqPw03zEbTT` **not used**  
**Authority:** Mike-authorized DEV install request; packet stop rules honored for missing fields / select options / no automations API

---

## What was verified (read-only)

| Check | Result |
|-------|--------|
| Required tables present | PASS — Homework Completions, Zoom Meetings, Enrollments, XP Reward Rules, XP Events, Config, Weeks |
| Config C-025 fields | PASS — percent, gate credit, makeup days, deadline mode, PW toggle, coach approval, email toggles/template |
| Canonical XP reason fields | PASS — `XP Reason Public`, `XP Reason Debug` present (bare Reason* absent — good) |
| `ZOOM_ATTEND_BASE` rule | PASS — active, **XP Amount = 60** (`recwwmZY5IZssmo6b`) |
| Automations Meta API | **FAIL / blocked** — `GET .../automations` → **403**; cannot list, create, paste, or read enabled state via API |
| PROD writes | None |
| Make / email | None |

Offline evidence JSON: `tools/airtable/_preview/c025_117_dev_preflight.json`

---

## Hard gaps blocking S16 117a/117b install

### Missing fields (exact names expected by repo scripts)

| Table | Missing field | Severity |
|-------|---------------|----------|
| **Homework Completions** | `Zoom Meeting` (link) | **Blocker** — 117a identity |
| **Homework Completions** | `Activity Date` | **Blocker** — makeup + XP date |
| **Homework Completions** | `XP Event` (singular link) | High — writeback (HC has plural `XP Events` instead) |
| **Homework Completions** | `Send Recording Approval Email?` | **Blocker** for 117b |
| **Homework Completions** | `Recording Approval Email Sent?` | **Blocker** for 117b idempotency |
| **Zoom Meetings** | `Recording Attendees` (link → Enrollments) | **Blocker** for gate-credit write path |
| **Zoom Meetings** | `Makeup Window Days Override` | Medium — optional override |
| **Zoom Meetings** | `Deadline Mode Override` | Medium — optional override |
| **XP Events** | `Activity Date` | **Blocker** — script writes this name; DEV has **`XP Activity Date`** instead |
| **Enrollments** | `Progress Processing Enabled?` | Low — 117a treats missing as enabled |

### Missing single-select options

| Field | Required by 117a v1.1 | Present in DEV? |
|-------|----------------------|-----------------|
| **XP Bucket** | `Zoom` | **No** — has `Zoom Attendance` |
| **XP Source** | `Zoom Recording` | **No** — live labels only (`Zoom Meeting Attendance Base`, …) |

### Name mismatches (do not invent silently)

| Script expects | DEV has | Action needed |
|----------------|---------|---------------|
| HC.`XP Event` | HC.`XP Events` | Confirm singular writeback field vs plural reverse link |
| XP Events.`Activity Date` | XP Events.`XP Activity Date` | Create alias field **or** authorize script field-name change on a feature branch |

---

## Architecture note (do not ignore)

DEV already contains a **Stage 17 Zoom Attendance** recording-quiz surface (review status, satisfactory, credit formulas, email send key/sent-at, etc.).

Repo **S16 117a/117b** targets **Homework Completions** + Source Key `ZOOM_RECORDING|meeting|enrollment`.

These are **not interchangeable**. Installing S16 without the HC schema above would be non-functional. Choosing Stage 17 instead would require different scripts (not the current master 117a/117b).

See [C025_ARCHITECTURE_RECONCILIATION.md](../v2/C025_ARCHITECTURE_RECONCILIATION.md).

---

## Automation state in DEV

**Unknown via API (403).** Mike (or OMNI) must open Airtable Automations UI and report whether any of these exist:

- `117a - Zoom Recording Credit - Award XP from Quiz Completion`
- `117b - Zoom Recording Credit - Send Approval Email Webhook`

No agent overwrite was attempted.

---

## Authorized next actions for Mike

1. **Schema decision (OMNI / Airtable UI):** create the missing S16 fields + select options listed above **in DEV only**, **or** explicitly choose Stage 17 ZA path instead (different package).  
2. Confirm XP Events date field strategy: add `Activity Date` **or** authorize a repo script change to `XP Activity Date`.  
3. Confirm XP Bucket/Source options: add `Zoom` + `Zoom Recording` **or** authorize script mapping to existing labels.  
4. After schema PASS, paste 117a v1.1 + 117b v1.0 from GitHub (docblock through end; skip GitHub header), leave **OFF**, then re-run controlled DEV tests.  
5. Keep **118/119 OFF**; no PROD paste.

---

## Status vs install packet

| Packet claim | After this preflight |
|--------------|----------------------|
| Implemented in repository | Yes |
| Ready for DEV installation | **Blocked by schema + select options + automations API** |
| Installed / verified in DEV | **No** |
| Ready for PROD | **No** |
