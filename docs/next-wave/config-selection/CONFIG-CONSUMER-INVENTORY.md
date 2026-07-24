# Config Consumer Inventory

Agent 10 · 2026-07-24 · Repo search of automations, helpers, web, tools, formulas, tests.

**Confirmed fact:** Four Config rows are intentional year-specific records. Ambiguous selection is the defect — not multi-row existence.

PROD evidence (`docs/overnight/config-xp/prod-config-snapshot-2026-07-24.json`):

| Year | Max Videos | Record id | Rich Stage-17 flags? |
|---|---|---|---|
| 2025–2026 | 4 | `recq14M5hEv3TIGEj` | Yes (only fully populated row) |
| 2026–2027 | 6 | `rechc1f9f4kVM1tHP` | Sparse (YN companions mostly No) |
| 2027–2028 | 5 | `rectmrnvo9a79wgq3` | Sparse |
| 2028–2029 | 4 | `recXwc19BtG1L2PzW` | Sparse |

---

## A. Direct Config table readers (script/API)

### 1. Superseded 117a — Award XP from Quiz Completion

| | |
|---|---|
| **File** | `airtable/automations/shooting-challenge/_superseded/117a-s16-homework-completions-award-xp-SUPERSEDED.js` |
| **Fields read** | Zoom Recording XP Percent of Live; Recording Gives Full Zoom Gate Credit?; Zoom Recording Makeup Window Days; Zoom Recording Deadline Mode; Recording Quiz Requires Coach Approval? |
| **Selection** | `configQuery.records[0]` |
| **Enrollment available?** | Yes (from Homework Completion) |
| **Program Instance available?** | Not used |
| **School Year available?** | Via Enrollment (not used) |
| **Fallback** | Hardcoded defaults (50%, true, 7, Later of Both, true) if no rows |
| **Ambiguity risk** | **HIGH** — first-record order-dependent |
| **Wrong-year effect** | Wrong XP %, gate credit, makeup window, coach-approval gate |

Status: superseded by Stage 17 path; still documents the anti-pattern.

### 2. Superseded 117b — Approval Email Webhook

| | |
|---|---|
| **File** | `…/_superseded/117b-s16-homework-completions-approval-email-SUPERSEDED.js` |
| **Fields read** | Recording Approval Email Enabled?; Timing; Template Key |
| **Selection** | `configQuery.records[0]` |
| **Enrollment / PI / School Year** | Enrollment yes; PI/year unused |
| **Fallback** | Skip if Config missing email-enabled field |
| **Ambiguity risk** | **HIGH** |
| **Wrong-year effect** | Email send/suppress using wrong season flags |

### 3. Final summary repair extension 090g

| | |
|---|---|
| **File** | `airtable/extension-scripts/safe-backfills/repair-final-090g-build-final-challenge-summary-email.js` |
| **Fields read** | Challenge Week Count |
| **Selection** | `configQuery.records[0]` |
| **Enrollment / PI / School Year** | Not used for Config pick |
| **Fallback** | `0` if no rows |
| **Ambiguity risk** | **HIGH** for multi-year bases |
| **Wrong-year effect** | Wrong challenge week count in final email math |

### 4. `preview_final_email.py`

| | |
|---|---|
| **File** | `tools/airtable/preview_final_email.py` |
| **Fields read** | Challenge Week Count |
| **Selection** | `config_rows[0]` |
| **Ambiguity risk** | **HIGH** |
| **Wrong-year effect** | Preview week count wrong |

### 5. `generate_final_summary_preview.py`

| | |
|---|---|
| **File** | `tools/airtable/generate_final_summary_preview.py` |
| **Fields read** | Challenge Week Count (via `tables["config"][0]`) |
| **Ambiguity risk** | **HIGH** |
| **Wrong-year effect** | Same as above |

### 6. Stage 17 PROD Config setter

| | |
|---|---|
| **File** | `tools/airtable/_c025_stage17_prod_config_set.py` |
| **Fields written/read** | Recording path / makeup / XP % / approval email suite |
| **Selection** | Hardcoded `PRIMARY = recq14M5hEv3TIGEj` (“only row with Active XP Rule Set”) |
| **Ambiguity risk** | **MEDIUM** — deterministic id, but reason is sparse-field heuristic, not year key |
| **Wrong-year effect** | Stage 17 flags only land on 2025–2026; other years stay sparse |

### 7. Stage 17 batch deploy Config picker

| | |
|---|---|
| **File** | `tools/airtable/_c025_stage17_prod_batch_deploy.py` |
| **Selection heuristics** | (1) id linked as Zoom Meetings.Global Config → (2) Is Global Default? → (3) first row with Zoom Recording XP Percent of Live |
| **Ambiguity risk** | **HIGH** — not year-aware |
| **Wrong-year effect** | Patches whichever row happens to be linked/populated |

### 8. Gap / readiness / overnight probes

| File | Selection | Risk |
|---|---|---|
| `tools/airtable/pv2_dev_prod_gap_audit.py` | Fetches all Config rows; compares keys | LOW for read; may mislabel multi-year as “mismatch” |
| `tools/airtable/overnight_config_xp_analyze.py` | Iterates all Config rows | LOW |
| `tools/airtable/c013_prod_readiness_probe.py` | Lists Config | LOW |
| `tools/airtable/_c025_stage17_*` schema/install probes | Schema + sample Config | LOW |

---

## B. Indirect Config consumers (linked / Effective / stamped)

### 9. Stage 17 Effective Config resolver

| | |
|---|---|
| **File** | `airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.js` → `resolveEffectiveConfigValue` |
| **Fields** | Global/Program/Meeting override layers for recording flags |
| **Selection** | Meeting override → Program Config → Global Config |
| **Year awareness** | **None** — trusts already-linked Config records |
| **Ambiguity risk** | **HIGH if wrong Config linked to meeting** |
| **Wrong-year effect** | Wrong Effective Enabled / XP% / makeup / Perfect Week credit |

### 10. Pure Zoom recording credit helper

| | |
|---|---|
| **File** | `lib` path: `airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.js` |
| **Fields** | XP %, makeup days/mode, coach approval, gate credit, approval email suite, Perfect Week credit |
| **Selection** | Caller-supplied `config` object |
| **Ambiguity risk** | Inherited from caller |
| **Wrong-year effect** | Same as caller |

### 11. Automations 117 / 117a–117f (Stage 17)

| | |
|---|---|
| **Files** | `117-zoom-recording-credit-orchestrator.js`, `117a`…`117f` |
| **Fields** | Read Effective* lookups / Zoom Attendance stamped flags (not direct Config table select) |
| **Enrollment / PI / School Year** | Enrollment yes; year unused for Config pick |
| **Ambiguity risk** | **MEDIUM–HIGH** upstream linkage |
| **Wrong-year effect** | XP amount, gate credit, Perfect Week credit, approval email |

### 12. Automation 042 — Level assignment with gate blocking

| | |
|---|---|
| **File** | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` |
| **Config table read?** | **No** |
| **Zoom Config relationship** | Counts ZA rows with `Zoom Gate Credit Earned?` (stamped by Stage 17 using Config) |
| **Ambiguity risk** | **INDIRECT** — does not re-validate Config year or `Recording Gives Full Zoom Gate Credit?` |
| **Wrong-year effect** | Inflated/deflated Minimum Zoom Meetings gate progress |
| **Detail** | See `AUTOMATION-042-CONFIG-AUDIT.md` |

---

## C. High-risk product surfaces (Config fields vs actual consumers)

| Concern | Config field(s) | Current consumer reality | Wrong-year effect |
|---|---|---|---|
| Perfect Week video minimum | *(no Config field)* | Hardcoded `3` in `057` + WAS formula `>= 3` | Not year-keyed today; future Config field must use resolver |
| Zoom recording flags | Recording* / Zoom Recording* | Effective lookups + Stage 17 helpers | Silent wrong credit/email |
| Maximum videos | Max Videos Per Submission | **No automation JS reader found** (likely Fillout/Make/UI / future) | Cap wrong if a reader uses first-row |
| Active XP rule set | Active XP Rule Set | Present only on 2025–2026 row; **010/054/059 select XP Reward Rules by Rule Key + Active?**, not Config | Low live impact today; high if scripts start reading Config for rule set |
| Submission XP | Submission XP Active?, Submission Base XP, Shot XP Per Shot | 010 uses XP Reward Rules `SHOOTING_BASE`; Config base/shot fields are alternate/GOAT test economics | Confusing dual design; year pick would amplify wrong economics if adopted |
| Review-enabled toggles | HW Review Enabled?, Video Review Enabled? | **No automation consumer found in repo** | Latent |
| Active school year | Active School Year (primary) | Used as year key once resolver adopted; currently unused by first-row readers | N/A |
| File naming / storage | Root Google Drive Folder ID/Link, File Naming Pattern | Shared Drive id across years in snapshot; naming formulas use Enrollment/Program Instance, not Config pattern | Drive root wrong if years diverge later |

---

## D. Web / formulas / tests

| Consumer | Reads Config table? | Notes |
|---|---|---|
| `web/lib/**` | No | `getAirtableConfigStatus` is env/token status, not Config table |
| `web` game-manual / XP rules | XP Reward Rules / Levels | Not Config |
| WAS formula Perfect Week Video Requirement Met? | No | Hardcoded `>= 3` |
| `lib/c025-*.test.js` | Injected fixtures | Safe |
| Overnight docs incorrectly labeling 4 rows as “defect” | N/A | Corrected by this wave — keep rows |

---

## E. Ambiguous readers (priority list)

1. Any `records[0]` / `config_rows[0]` / `tables["config"][0]` path (superseded 117a/b, 090g, preview tools)
2. Stage 17 deploy heuristics that pick “populated” or “linked” Config without year key
3. Zoom Meetings Global Config / Program Config links that are not year-validated
4. Overnight MIKE-ACTIONS that recommend collapsing Config to one row (**do not follow**)

## F. Non-ambiguous / healthy patterns

- Explicit record id targeting (once id is year-correct)
- XP Reward Rules lookup by Rule Key + Active? (010/054/059) — separate from Config table
- Levels / Level Gate Rules table reads in 042
- Pure helpers that require caller to pass an already-resolved `config` object
