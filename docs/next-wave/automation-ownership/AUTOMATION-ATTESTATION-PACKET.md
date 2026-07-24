# Automation UI Attestation Packet — Agent 9

**Purpose:** Exact manual checklist for Mike in Airtable UI (PROD `appn84sqPw03zEbTT`, then DEV `appTetnuCZlCZdTCT`).  
**Generated:** 2026-07-24  
**Do not guess from GitHub.** Fill Observed columns from the live automation panel.

---

## Verified PROD findings (2026-07-24)

Recorded from live PROD UI attestation. These override prior GitHub-expected assumptions for the listed rows.

| # | Verified PROD state | Ownership note |
|---|---------------------|----------------|
| **112** | **Absent** from PROD | No VF create competition with 013 in PROD |
| **117** | **Present**, script **v1.1** — sends Zoom recording **approval email** payload to Make only; **does not award XP** | PROD Automation 117 is the approval-email handoff (Make **117f** path), **not** a `ZOOM_CREDIT` XP writer. Do **not** apply the 117-versus-117c XP-writer / XOR warning to this PROD automation. |
| **117c** | **Absent** from PROD | No modular Zoom XP create automation installed |
| **063** | **Absent** from PROD | Grade Band path owned by 020 at create/repair |
| **111** | **Absent** from PROD | Grade Band path owned by 013 |
| **020** | **Present**, script header version **v3.0.0** | Authoritative HC create / Grade Band writer |

**ZOOM_CREDIT exclusivity (PROD):** The prior “exactly one of 117 XOR 117c ON for XP” warning does **not** apply to PROD Automation **117** as currently installed (email-only, v1.1). PROD **117c** is absent. Any future install of a Zoom recording **XP** orchestrator (repo `117-zoom-recording-credit-orchestrator.js`) or **117c** must be attested separately before treating either as a live `ZOOM_CREDIT` writer.

---

## How to attest (per row)

For each automation:

1. Open Automations → find by **exact name** (or number prefix).  
2. Record **ON/OFF** (or Deleted / Not found).  
3. Record **trigger type** + **table/view/conditions**.  
4. Open script step → confirm **version string** matches Expected (or note drift).  
5. Confirm **ownership classification** still makes sense.  
6. Initial + date the Attested column.

---

## Priority attestation set

### P0 — Conflict / exclusivity

| # | Automation name (expected) | Expected ON/OFF | Expected trigger | Trigger table/view | Expected script version | Ownership classification | Observed ON/OFF | Observed trigger | Observed version | Attested (initial/date) | Notes |
|---|----------------------------|-----------------|------------------|--------------------|-------------------------|--------------------------|-----------------|------------------|------------------|-------------------------|-------|
| **112** | 112 - Video Review and XP - Create Video Feedback from Submission Asset | **OFF** (or Deleted) | When record matches conditions | Submission Assets · Upload Destination = Video Feedback · VF empty | v2.1 (must stay OFF) | legacy_off | **Absent** | n/a | n/a | PROD 2026-07-24 | Verified absent from PROD — must not reappear ON |
| **013** | 013 - Submission Intake - Create or Link Video Feedback | **ON** | When record matches conditions | Submission Assets · video ready for VF prep | v2.0 | authoritative_writer | | | | | Canonical VF create |
| **117** | 117 — Zoom — Send Recording Approval Email to Make | Present (approval email) | Zoom Attendance · Satisfactory recording path | Zoom Attendance | **v1.1** | email / Make handoff only — **not** XP writer | **Present** | Zoom Attendance → Make webhook | **v1.1** | PROD 2026-07-24 | Sends approval-email payload to Make only; **does not award XP**. Do **not** treat as 117-vs-117c XP dual-writer. |
| **117c** | 117c - Zoom Recording Credit - Create Zoom XP Event | **Absent / OFF** | Zoom Attendance Recording Quiz | Zoom Attendance | v1.1.0 (repo only) | absent_prod / legacy_off | **Absent** | n/a | n/a | PROD 2026-07-24 | Verified absent from PROD — no XOR conflict with PROD 117 (email) |
| **031** | 031 - Weekly Summary and Goal Logic - Find or Create Weekly Athlete Summary from Submission | **ON** | When record matches conditions | Submissions · Count This Submission? · WAS empty | v3.1 | authoritative_writer | | | | | Primary WAS creator |
| **101** | 101 - Zoom Attendance XP - Award Meeting XP | **ON** | When record matches conditions | Zoom Meetings · Create XP Events (live Attendees) | v5.5 | authoritative XP; WAS side-create risk | | | | | Confirm never recording Attendees |
| **118** | 118 - Email - Schedule Weekly Summary Email Build | **OFF** until authorized | Scheduled · Sunday 5am Denver | Enrollments/Weeks batch | v1.2 | duplicate_risk / OFF | | | | | WAS create race |
| **119** | 119 - Email - Schedule Weekly Summary Email Send | **OFF** until authorized | Scheduled | WAS | v1.2 | orchestrator / OFF | | | | | |

### P1 — Deleted / superseded

| # | Automation name (expected) | Expected ON/OFF | Expected trigger | Trigger table/view | Expected script version | Ownership classification | Observed ON/OFF | Observed trigger | Observed version | Attested (initial/date) | Notes |
|---|----------------------------|-----------------|------------------|--------------------|-------------------------|--------------------------|-----------------|------------------|------------------|-------------------------|-------|
| **063** | 063 - Homework Review and XP - Copy Enrollment Grade Band to Homework Completion | **DELETED** (or OFF) | n/a | Homework Completions | v2.0 historical | legacy_off | **Absent** | n/a | n/a | PROD 2026-07-24 | Verified absent; 020 owns Grade Band |
| **111** | 111 - Video Review and XP - Copy Enrollment Grade Band to Video Feedback | **DELETED** (or OFF) | n/a | Video Feedback | v1.1 historical | legacy_off | **Absent** | n/a | n/a | PROD 2026-07-24 | Verified absent; 013 owns Grade Band |
| **020** | 020 - Homework - Link or Create Homework Completion | **ON** | When record matches conditions | Submission Assets · homework ready | **v3.0.0** | authoritative_writer | **Present** | Submission Assets · homework ready | **v3.0.0** | PROD 2026-07-24 | Present (version 3 family); exact script-header wording: `Version: v3.0.0` |

### P2 — Supporting XP / email

| # | Automation name (expected) | Expected ON/OFF | Expected trigger | Trigger table/view | Expected script version | Ownership classification | Observed ON/OFF | Observed trigger | Observed version | Attested (initial/date) | Notes |
|---|----------------------------|-----------------|------------------|--------------------|-------------------------|--------------------------|-----------------|------------------|------------------|-------------------------|-------|
| **010** | 010 - Submission Intake - Create XP Event from Submission | ON | Count This Submission? / XP path | Submissions | 10.4 | authoritative_writer | | | | | |
| **054** | 054 - … Streak Occurrences - Create or Repair Streak XP Event | ON | Source Status Ready for XP | Streak Occurrences | v5.6 | authoritative_writer | | | | | |
| **059** | 059 - … Create XP Event from Achievement Unlock | ON | Record created · Pending (no Ready-for-059 filter) | Athlete Achievement Unlocks | v3.5 | authoritative_writer | | | | | |
| **065** | 065 - … Create Homework XP Event | ON | Satisfactory + XP pending | Homework Completions | v9.2 | authoritative_writer | | | | | |
| **114** | 114 - … Create or Update Video XP Event | ON | Ready for XP Automation? | Video Feedback | v5.8 | authoritative_writer | | | | | |
| **066** | 066 - … Create Shot Milestone Unlocks | ON | Run Shot Milestone Check? | Enrollments | v3.3 | authoritative_writer | | | | | |
| **042** | 042 - … Assign Current and Next Level with Gate Blocking | ON | Enters view Needs Level Assignment | Enrollments | 3.1 | authoritative_writer | | | | | |

### P3 — Threshold gap (UI hunt)

| Question | Expected answer | Observed | Attested |
|----------|-----------------|----------|----------|
| Does any automation write WAS Threshold XP Status / create `WEEKLY_THRESHOLD_*` XP Events? | Unknown — repo has **no** writer | | |
| If found: name / ON-OFF / version / Source Key format | Document here | | |
| If not found | Confirm **missing** — do not invent overnight | | |

---

## Exclusivity sign-off (required)

Copy into overnight / next-wave status when complete:

```
PROD attestation 2026-07-24 (verified partial):
- 112: Absent from PROD
- 013: ON = ____ version ____
- 020: Present = v3.0.0 (script header Version: v3.0.0)
- 031: ON = ____ version ____
- 063: Absent from PROD
- 101: ON = ____ version ____
- 111: Absent from PROD
- 117: Present = v1.1 — approval email → Make only; does NOT award XP
- 117c: Absent from PROD
- ZOOM_CREDIT sole writer = N/A for PROD Automation 117 (email-only; not an XP writer). 117c absent. Do not apply 117-vs-117c XP XOR to PROD 117.
- 118: OFF (installed v1.4; schedule OFF during validation) = ____
- 119: OFF (installed v1.4; arms Send only — not webhook) = ____
- 072: v4.0 empty-week send_short verified Schmidt = ____
- 074: ON webhook handoff (repo v2.1 / UI cited v2.0) = ____
- Make WAS email: Bulk Email May 18 ON = ____
- Weekly Threshold writer found? YES|NO name=____
```

---

## DEV cross-check (same rows)

Repeat P0–P1 on DEV `appTetnuCZlCZdTCT`. Note intentional DEV-only differences (e.g. **115** ON in DEV only).

**Naming caution:** Repo may still contain `117-zoom-recording-credit-orchestrator.js` (XP). PROD UI slot **117** is attested as the **approval-email** sender (**v1.1**). Do not assume number **117** always means the XP orchestrator.
