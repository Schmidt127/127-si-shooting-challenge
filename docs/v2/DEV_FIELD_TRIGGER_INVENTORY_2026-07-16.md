# DEV Field & Trigger Inventory — 2026-07-16 (Worker A / PR #35)

**Base target:** DEV `appTetnuCZlCZdTCT`  
**PROD:** Untouched  
**Auth status:** **BLOCKED** — no `AIRTABLE_API_TOKEN` / `AIRTABLE_TOKEN` in this cloud environment; no browser Airtable session. Same blocker as concurrent C-025 / OMNI agents.  
**Evidence source used:** DEV schema snapshot **`airtable/schema/snapshots/dev-20260706/`** (generated `2026-07-06T16:16:13`) — labeled **snapshot-verified**.  
**Live UI ON/OFF / automation trigger filters / Make webhook / view filters:** **not live-verified** — require Mike/OMNI or PAT.

---

## Evidence legend

| Label | Meaning |
|-------|---------|
| **verified in DEV (snapshot)** | Present in 2026-07-06 Metadata export |
| **repository-ready** | Spec/script in GitHub can proceed with this evidence |
| **requires DEV paste** | Script exists or will exist; not pasted to Airtable by this agent |
| **requires Mike approval** | Schema create, schedule enable, Live send, delete |
| **requires PROD promotion** | Out of scope for this packet |
| **live-blocked** | Needs authenticated live DEV read (PAT or UI) |

---

## PART 1 — Inventory results

### 1. Quiz / PDF attachment field (Fillout)

| Finding | Status |
|---------|--------|
| `Final Reflection Quiz Submissions` has **0** `multipleAttachments` fields (55 fields total) | **verified in DEV (snapshot)** |
| Fillout PDF attachment **not installed** as of 2026-07-06 | **verified in DEV (snapshot)** |
| Recommended field to create (Mike/OMNI) | **`Quiz Result PDF`** (Attachment) — **requires Mike approval** |
| Live confirmation Fillout wiring after field create | **live-blocked** |

### 2. HW17 parent Submission vs direct assets

| Finding | Status |
|---------|--------|
| Upload Ready / homework asset formulas require **`Submission - Linked`** + **`Enrollment - Linked`** + attachment + HC link/slot | **verified in DEV (snapshot)** |
| Authoritative C-009 path | **Both:** create/find parent **Submission** (Enrollment+Week+Homework Name 1=HW17) **and** create **Submission Assets** | **repository-ready** |
| Assets-only without Submission | Breaks Upload Ready formula path | **verified in DEV (snapshot)** |

### 3. Asset Purpose / Slot / Type option labels

| Field | Exact options (Submission Assets) | Status |
|-------|-----------------------------------|--------|
| **Asset Purpose** | `Homework 1`, `Homework 2`, `Video For Feedback`, `Registration Headshot`, `Other` | **verified in DEV (snapshot)** |
| **Asset Slot** | `HW1`, `HW2`, `VIDEO`, `VIDEO-1`, `VIDEO-2`, `VIDEO-3`, `VIDEO-4` | **verified in DEV (snapshot)** |
| **Asset Type** | `Homework PDF`, `Homework Image`, `Homework Document`, `Video Feedback`, `Submission Photo`, `Submission Video`, `Athlete Headshot`, `Other` | **verified in DEV (snapshot)** |
| **Upload Status** | `Pending Link`, `Processing`, `Uploaded`, `Error`, `Ready`, `No File` | **verified in DEV (snapshot)** |

HW17 mapping: Purpose=`Homework 1`, Slot=`HW1`, Type=`Homework PDF` (or inferred).

### 4. Coach views require parent Submission?

| Finding | Status |
|---------|--------|
| No view literally named “Coach…” in DEV views export | **verified in DEV (snapshot)** |
| Formula `Upload Ready?` / Ready-to-send helpers require `Submission - Linked` for Homework Completions destination | **verified in DEV (snapshot)** → treat as **yes, parent Submission required** for file pipeline |

### 5. Active? / Progress Processing Enabled?

| Field | Table | Present? | Status |
|-------|-------|----------|--------|
| `Active?` | Enrollments | **Yes** (checkbox) | **verified in DEV (snapshot)** |
| `Progress Processing Enabled?` | Enrollments | **No** | **verified in DEV (snapshot)** — **requires Mike approval** to create |

### 6. Automation ON/OFF + version evidence

| Automation | GitHub version | Live ON/OFF | Live pasted version | Status |
|------------|----------------|-------------|---------------------|--------|
| 010 | 10.4 | UNKNOWN | UNKNOWN | **live-blocked** |
| 031 | v3.1 | UNKNOWN | UNKNOWN | **live-blocked** |
| 053 | 5.1 | UNKNOWN | UNKNOWN | **live-blocked** |
| 065 | v9.2 | UNKNOWN | UNKNOWN | **live-blocked** |
| 072 | v3.7 | UNKNOWN | UNKNOWN | **live-blocked** |
| 059 | v3.5 | UNKNOWN | UNKNOWN | **live-blocked** |
| 042 | 3.0 | UNKNOWN | UNKNOWN | **live-blocked** |
| 043 | v2.0 | UNKNOWN | UNKNOWN | **live-blocked** |
| 112 | v2.1 | Docs claim OFF | UNKNOWN | **live-blocked** (docs: OFF; UI attest required) |

Note: DEV has an **Automations** metadata table (`Status` Live/Off/Legacy) — readable via Data API **if PAT present**. Not queried this run.

### 7. Automation 059 trigger / filters

| Item | Evidence | Status |
|------|----------|--------|
| Formula `Ready for 059 XP?` | Exists; Pending + empty XP Events | **verified in DEV (snapshot)** |
| Authoritative GitHub trigger | Record **created**; Pending; Shot Milestone not empty; **no Ready** | **repository-ready** |
| Live Airtable trigger type/filters | UNKNOWN | **live-blocked** |

### 8. Automation 042 writing Level Gate Rule

| Item | Evidence | Status |
|------|----------|--------|
| Script v3.0 writes `Enrollments.Level Gate Rule` | GitHub | **repository-ready** |
| View `042 - Needs Level Assignment` exists on Enrollments | **verified in DEV (snapshot)** |
| Live enrollments with gate populated post-042 | UNKNOWN | **live-blocked** |

### 9. Weekly-send fields / Make writeback

| Field on Weekly Athlete Summary | Present? | Status |
|--------------------------------|----------|--------|
| `Build Weekly Email Now?` | Yes | **verified in DEV (snapshot)** |
| `Weekly Email Ready?` | Yes | **verified in DEV (snapshot)** |
| `Send to Make?` | Yes | **verified in DEV (snapshot)** |
| `Weekly Email Sent?` | Yes | **verified in DEV (snapshot)** |
| `Weekly Email Sent At` | Yes | **verified in DEV (snapshot)** |
| `Weekly Email Error` | Yes | **verified in DEV (snapshot)** |
| `sendMode` (`Test` \| `Live`) | Yes | **verified in DEV (snapshot)** |
| Package fields (Subject/Recipients/HTML/Text/Payload JSON/…) | Yes | **verified in DEV (snapshot)** |
| Make writeback actually sets Sent? | UNKNOWN | **live-blocked** |
| `eventId` in Make | Design key `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` — not an Airtable field | **repository-ready** |

### 10. DEV-safe Make webhook for weekly email

| Finding | Status |
|---------|--------|
| No webhook URL in env / git | **live-blocked** |
| Must use DEV Make + `sendMode=Test` only | **requires Mike approval** |

---

## C-019 Testing views (snapshot)

| Table | View `Testing`? | Notes | Status |
|-------|-----------------|-------|--------|
| Athlete Achievement Unlocks | **Yes** `viwhHkNyEPe21oMbI` | Filter not in API | **verified in DEV (snapshot)** name only |
| Weekly Athlete Summary | No (`Grid Testing View` instead) | Rename/create `Testing` | **requires Mike approval** (UI) |
| Submissions | No | Create | UI |
| Submission Assets | No | Create; filter `Enrollment - Linked` | UI |
| Homework Completions | No | Create | UI |
| Video Feedback | No | Create | UI |
| XP Events | No | Create | UI |
| Streak Occurrences | No | Create | UI |

---

## Decisions unlocked by this inventory

| Package | Decision |
|---------|----------|
| **C-009** | Implement 067 **v2.0** with parent Submission + assets; gate asset path on `Quiz Result PDF` (or candidates). Until field exists → completion bridge + `no_attachment_field` / `no_attachment_yet`. |
| **C-010** | PPE **must be created** before progress skips matter. Matrix: PPE for 010/031/053/065; `Active?`+Schmidt for 072. Missing PPE → treat enabled. |
| **C-011** | **118/119 still correct.** WAS checkbox fields confirmed. Implement repo scripts; do not schedule-enable. |
| **059/043/112** | Specs stand; live ON/OFF/trigger **live-blocked**. |

---

## Mike actions to unblock live verification

1. Place read-only DEV PAT in agent env (`AIRTABLE_API_TOKEN`) **or** run OMNI inventory checklist in UI.  
2. Create Enrollments.`Progress Processing Enabled?` (checkbox, default true).  
3. Create Final Reflection Quiz Submissions.`Quiz Result PDF` (attachment) + Fillout map.  
4. Attest Automations UI ON/OFF + 059 trigger for listed automations.  
5. Provide DEV Make weekly webhook (not committed) for Test-mode 074.
