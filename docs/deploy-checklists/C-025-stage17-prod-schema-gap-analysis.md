# C-025 Stage 17 — Production schema gap analysis (read-only)

**Status:** Audit complete — **PROD not ready** for Stage 17 automation paste  
**Date:** 2026-07-18 (superseding refresh on feature tip; live Meta audit evidence dated 2026-07-18)  
**Source audit commit:** `0510663` on `audit/c025-stage17-prod-readiness`  
**This copy:** Brought onto `feature/c025-stage17-zoom-attendance` for the production-readiness finalize pass  
**Mode:** **Read-only** meta schema + filtered record reads (no writes, no paste, no enable)  
**DEV:** `appTetnuCZlCZdTCT`  
**PROD:** `appn84sqPw03zEbTT`  
**Evidence (local, gitignored):** `tools/airtable/_preview/c025_stage17_prod_readiness_audit.json`  
**Re-run helper:** `tools/airtable/_c025_stage17_prod_readiness_audit.py`

### Superseding notes (2026-07-18 finalize)

| Item | Update |
|------|--------|
| DEV one-click ETF | **Pass** confirmed on `recEuHFTjBftoJGMc` (`C025_STAGE17_DOWNSTREAM`, query **11/22**, 057+042 fired, Run Test? cleared). Schema gap verdict **unchanged**. |
| Dated schema snapshots | `prod-20260706` / `dev-20260706` **lack** Zoom Attendance (DEV ZA created later). Live Meta audit supersedes snapshots for table presence. |
| Repo alignment gate | Feature tip commit `e8db32e` is **115 v1.6**; working tree holds uncommitted **115 v1.8** + paste. Align/commit before PROD packaging. |

---

## 1. Executive summary

**Zoom Attendance does not exist in Production.** It is not renamed under another table. PROD still runs the **live Zoom Meetings → Attendees → Automation 101** path only. There is **no** Stage 17 recording-quiz credit surface in PROD, and **no** Stage 16 Homework Completions Zoom-recording residue either.

| Verdict | Detail |
|---------|--------|
| Zoom Attendance in PROD | **Missing** (table absent) |
| Similarly named attendance table | **None** (only `Zoom Meetings` + unrelated `Final Reflection Quiz Submissions`) |
| Architecture | PROD = **pre–Stage 17** live attendance; DEV = Stage 17 ZA + Config/ZM effective fields |
| `ZOOM_ATTEND_BASE` rule | **Present in both** — active, **60 XP** |
| Recording XP Source option | **Missing in PROD** (`Zoom Meeting Recording Quiz`) |
| Automations 117 / 057 v1.3 / 042 v3.1 | **Not installable** until schema migration |
| Controlled migration required | **Yes** — schema + selective Config data; then paste OFF; then smoke |

**Highest-risk Production issue:** Installing or enabling Stage 17 scripts (or any path that writes recording athletes into `Zoom Meetings.Attendees`) can **double-award live XP via Automation 101** while live `ZOOM_ATTEND_BASE|…` history already exists in PROD.

**Counts (Stage 17 curated — see §5):**

| Metric | Count |
|--------|------:|
| Missing schema items (blocking + support) | **125** |
| Incompatible items | **1** |
| Raw DEV−PROD inventory delta (includes Testing Scenarios + ZZZ archives) | **233** (audit script) |

---

## 2. Whether Zoom Attendance exists in PROD

| Question | Answer |
|----------|--------|
| Table named `Zoom Attendance`? | **No** |
| Renamed equivalent? | **No** — no table name contains both Zoom + Attendance; similar names are only `Zoom Meetings` and `Final Reflection Quiz Submissions` |
| Fields on Homework Completions for Zoom recording? | **None** in PROD or DEV |
| Live attendance path present? | **Yes** — `Zoom Meetings.Attendees` + live XP Events with `ZOOM_ATTEND_BASE|…` |

**Conclusion:** The table is **truly missing**. PROD is on an **older (pre–Stage 17) architecture** for recording credit. A controlled **schema (+ Config value) migration** is required before any Stage 17 automation paste.

---

## 3. DEV-to-PROD table mapping

| Table | DEV | PROD | Notes |
|-------|:---:|:----:|-------|
| **Zoom Attendance** | Yes | **No** | **Hard blocker** — Stage 17 primary surface |
| Zoom Meetings | Yes | Yes | PROD lacks Stage 17 recording/effective/config-link fields |
| XP Events | Yes | Yes | Bucket OK; Source option for recording missing |
| XP Reward Rules | Yes | Yes | `ZOOM_ATTEND_BASE` = 60 both sides |
| Weekly Athlete Summary | Yes | Yes | Perfect Week Zoom count fields present |
| Enrollments | Yes | Yes | Missing inverse link to Zoom Attendance |
| Config | Yes | Yes | Missing all Stage 17 recording Config fields |
| Homework Completions | Yes | Yes | No Zoom-recording fields (S16 path not installed) |
| Level Gate Rules / Levels | Yes | Yes | OK for 042 base behavior |
| Submissions / Video Feedback / Weeks | Yes | Yes | OK for 057 non-Zoom inputs |
| **Testing Scenarios** | Yes | **No** | DEV-only ETF harness — **not** required for PROD 117/057/042 runtime |
| Engineering Test Framework | No | No | Not a table name; ETF uses **Testing Scenarios** in DEV |
| SYNC - Brackets | Yes | No | Unrelated to Stage 17 |

**DEV-only tables:** `Zoom Attendance`, `Testing Scenarios`, `SYNC - Brackets`  
**PROD-only tables:** none  

**Table counts:** DEV **32** · PROD **29**

---

## 4. DEV-to-PROD field mapping

### 4.1 Zoom Attendance (DEV canonical → PROD)

| Design / doc alias | DEV field | PROD | Type (DEV) |
|--------------------|-----------|------|------------|
| Attendance Type | `Attendance Method` | **missing (table)** | singleSelect: `Live`, `Recording Quiz` |
| Enrollment | `Enrollment` | **missing** | link |
| Zoom Meeting | `Zoom Meeting` | **missing** | link |
| Recording quiz result | `Recording Quiz Review Status` + `Recording Quiz Satisfactory?` | **missing** | singleSelect + checkbox |
| Credit Status | `Zoom Credit Approved?` / `Zoom Credit Conflict?` | **missing** | formula |
| Perfect Week Credit Applied? | same | **missing** | checkbox |
| Gate Credit Applied? | same | **missing** | checkbox |
| XP Event link | *(no ZA→XP Events link field in DEV)* | n/a | — |
| Source Key | `Zoom Credit Key` | **missing** | formula → `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Activity Date | *(on XP Events: `XP Activity Date`)* | present on XP Events | date |
| Dedupe / status | `Zoom Credit Key` + XP `Source Key` / `Active?` | live path only | — |

**Full DEV Zoom Attendance inventory:** **40 fields** (all absent in PROD because the table is absent). Automation-critical subset (~22) includes Method, links, RIDs, review/satisfactory/timestamps, credit formulas, XP amount, gate/PW flags, email send key/sent-at.

### 4.2 XP Events

| Requirement | DEV | PROD |
|-------------|-----|------|
| XP Bucket `Zoom Attendance` | Present | **Present** |
| XP Source `Zoom Meeting Recording Quiz` | Present | **Missing** |
| XP Source live (`Zoom Meeting Attendance Base`) | Present | Present |
| XP Points / Enrollment / Zoom Meeting | Present | Present |
| Zoom Attendance link | **Absent** | **Absent** (optional; 117 skips if missing) |
| Source Key | Present | Present |
| Soft-void `Active?` | Present | Present |
| XP Activity Date / Reason Public / Debug / Awarded By | Present | Present |

**PROD live samples (read-only):** `ZOOM_ATTEND_BASE|…` events exist with **60** XP, bucket `Zoom Attendance`, source `Zoom Meeting Attendance Base`, `Active?` true.  
**PROD recording samples:** **0** `ZOOM_CREDIT|…` events.  
**DEV recording sample:** at least one `ZOOM_CREDIT|…` at **30** XP.

### 4.3 Zoom Meetings (live path vs Stage 17)

| Field | PROD | Stage 17 need |
|-------|------|----------------|
| `Attendees` | Present | **Read-only** for 101 / 057 / 042 — **never write** from recording path |
| `Start Time`, `Week`, `Zoom Meeting Key` | Present | Required by 117 / 101 |
| `Create XP Events`, `XP Award Status`, `Meeting Status` | Present | 101 live path |
| `Recording Available At` | **Missing** | Stage 17 availability / intake |
| `Zoom Attendance` (inverse link) | **Missing** | Link integrity |
| Effective Recording* / Global·Program Config* / overrides | **Missing** (~64 non-archive) | Feed ZA formulas / lookups |
| ZZZ C025 Archive* | DEV only | Do **not** migrate archives to PROD |

### 4.4 Config (recording)

DEV has Stage 17 recording controls; PROD has **none** of the recording Config set. Observed DEV value: `Zoom Recording XP Percent of Live` = **50** with `Recording Path Enabled?` = true on at least one Config row.

### 4.5 Enrollments / WAS

| Field | PROD |
|-------|------|
| `Total Zoom Attendances` | Present (live count) |
| Level gate / recalc fields for 042 | Present |
| Link `Zoom Attendance` | **Missing** |
| WAS Perfect Week Zoom count/status fields | Present |

---

## 5. Missing fields and select options

### 5.1 Counting method (Stage 17 curated = **125**)

| Bucket | Count | Notes |
|--------|------:|-------|
| Missing table unit | 1 | `Zoom Attendance` |
| Zoom Attendance fields | 40 | Entire DEV inventory |
| XP Source select option | 1 | `Zoom Meeting Recording Quiz` |
| Config Stage 17 / recording fields | 18 | Including YN pairs + percent + path/makeup/gate/PW/email/deadline |
| Zoom Meetings Stage 17 support (excl. `ZZZ` archives) | 64 | Effective*, config links, overrides, recording quiz meeting fields, ZA link |
| Enrollments → Zoom Attendance link | 1 | |
| **Total** | **125** | |

**Excluded from curated count (not PROD Stage 17 runtime blockers):**

- `Testing Scenarios` table + 31 fields (DEV ETF only)
- `SYNC - Brackets`
- All `ZZZ C025 Archive …` Zoom Meetings fields
- Optional `XP Events.Zoom Attendance` link (missing in **both** bases today)

### 5.2 Required select options missing in PROD

| Table | Field | Missing option |
|-------|-------|----------------|
| XP Events | `XP Source` | **`Zoom Meeting Recording Quiz`** |
| Zoom Attendance | `Attendance Method` | `Live`, `Recording Quiz` (table missing) |
| Zoom Attendance | `Recording Quiz Review Status` | `Not Submitted`, `Needs Review`, `Satisfactory`, `Needs Correction` (table missing) |

### 5.3 Reward rule

| Rule | Expected | PROD | DEV |
|------|----------|------|-----|
| `ZOOM_ATTEND_BASE` | 60, active | **60, active** | **60, active** |
| Recording % | 50% via Config / ZA formula | **Config field missing** | **50** on Config |
| Expected recording XP | 30 (= floor(60×50%)) | No recording awards yet | Sample event **30** |

No separate `ZOOM_ATTEND_RECORDING` rule row is required by Stage 17 design (amount comes from ZA formula).

---

## 6. Field-type incompatibilities

| Item | Count | Detail |
|------|------:|--------|
| Type mismatches on shared focus fields | **0** | Shared tables that exist match types for Stage 17-relevant compared fields |
| Select option incompatibility | **1** | `XP Events.XP Source` lacks `Zoom Meeting Recording Quiz` |
| **Incompatible items (total)** | **1** | |

Once the Zoom Attendance table is created, formulas must be rebuilt carefully (DEV formulas reference field IDs). Treat formula text / linked lookup wiring as a **manual OMNI verification** item (§17).

---

## 7. Required views

| View | Where | PROD |
|------|-------|------|
| `Zoom Recording Quiz - Past Deadline` | Zoom Attendance (DEV) | **Missing** (table missing) — recreate after table |
| `Grid view` | Zoom Attendance | Default after table create |
| `Zoom` | XP Events (PROD already has) | Present — useful for smoke |
| Automation trigger | Not a saved view | 117 trigger: Zoom Attendance · Method = Recording Quiz · Enrollment + Meeting not empty |

No evidence that 057/042 require new named views beyond existing WAS/Enrollment triggers.

---

## 8. Required reward-rule changes

| Action | Needed? |
|--------|---------|
| Create `ZOOM_ATTEND_BASE` | **No** — exists |
| Change amount from 60 | **No** — already 60 |
| Add recording Source Label option on XP Events | **Yes** — select option `Zoom Meeting Recording Quiz` |
| Set Config `Zoom Recording XP Percent of Live` = 50 | **Yes** — after Config fields exist |
| Change live bonus rules (`ZOOM_ATTEND_BONUS_2/3`) | **No** for Stage 17 recording path |

---

## 9. Data backfill requirements

| Data | Required for go-live? | Notes |
|------|----------------------|-------|
| Historical Zoom Attendance rows for past meetings | **Optional / later** | Not required to install scripts OFF |
| Backfill `ZOOM_CREDIT|…` XP Events | **No** unless product asks for retroactive credit | Prefer append-only; soft-void mistakes |
| Config row values (percent 50, path/makeup/gate/PW toggles) | **Yes** before enabling recording awards | Match DEV global/program intent |
| Clear premature Applied? flags | N/A in PROD until rows exist | |
| Touch live `Attendees` or live XP | **Forbidden** | Preserve 101 history |

---

## 10. Risks to live attendance and XP history

Stage 17 design **must**:

| Rule | Status in scripts / this audit |
|------|--------------------------------|
| Never write recording athletes to `Zoom Meetings → Attendees` | Encoded in 117 / 057 v1.3 / 042 v3.1 — **must preserve in PROD** |
| Never duplicate live attendance XP | Disjoint keys: live `ZOOM_ATTEND_BASE\|…` vs recording `ZOOM_CREDIT\|…` |
| Prefer live when live + recording both exist | `Zoom Credit Conflict?` + 057/042 live-wins dedupe |
| Preserve valid historical XP Events | PROD already has live 60-XP events — **do not delete** |
| Soft-void incorrect new events | 117 sets `Active? = false` on conflict — **do not hard-delete** |

**Risks if migration is careless:**

1. **101 double-credit** if anything adds recording enrollments to `Attendees`.
2. **Pastoral XP noise** if 117 enabled before formulas/Config percent are correct.
3. **Gate/PW inflation** if 042/057 v3.1/v1.3 enabled before ZA qualification flags are trustworthy.
4. **False confidence** from pasting 117 while Zoom Attendance table is missing (automation will error).

Automation **101** must remain **unchanged**.

---

## 11. Smallest safe migration sequence

1. **Freeze scope** — Stage 17 ZA path only; do not install superseded S16 HC 117a/b.  
2. **OMNI: Config** — add Stage 17 recording fields; set percent **50** and path/makeup/gate/PW/email/deadline to match approved DEV intent.  
3. **OMNI: Zoom Meetings** — add non-archive Stage 17 support fields (at minimum Effective* / Recording Available At / ZA link / required overrides). **Do not** copy `ZZZ` archives.  
4. **OMNI: Create `Zoom Attendance`** — fields, selects, formulas, lookups matching DEV; verify credit key / conflict / amount (=30 when base 60 × 50%).  
5. **OMNI: Links** — Enrollments ↔ Zoom Attendance; Zoom Meetings ↔ Zoom Attendance.  
6. **OMNI: XP Events** — add select option `Zoom Meeting Recording Quiz` (bucket already exists).  
7. **View** — recreate `Zoom Recording Quiz - Past Deadline` if still required.  
8. **Read-only re-audit** — re-run this gap script; require curated missing = 0 for automation blockers.  
9. **Paste automations OFF** — order in §12.  
10. **Isolated smoke** — §14; then gradual enable — §13.

---

## 12. Automation installation order

| Order | Automation | Version | Dependency |
|------:|------------|---------|------------|
| 1 | **117** Orchestrator | v1.1.1 | Zoom Attendance + XP Source option + formulas |
| 2 | **057** Perfect Week eligibility | v1.3 | ZA PW fields; keep 058 unlock unchanged |
| 3 | **042** Level gates | v3.1 | ZA gate fields |
| — | **101** | unchanged | Never modify |
| — | **115** ETF | DEV-only | Do **not** promote to PROD as part of Stage 17 athlete path |
| — | 117a–f modular | reference | Prefer single orchestrator if slot-limited |

Paste from repo/deploy-checklist PASTE bodies; skip GitHub headers. Automations Meta API historically **403** — UI paste required.

---

## 13. Initial automation OFF/ON states

| Automation | Initial PROD state after paste | Later |
|------------|--------------------------------|-------|
| **117** | **OFF** | ON only after isolated recording smoke passes |
| **057** | Paste while **OFF** or keep prior ON only if still v1.2 — prefer paste OFF then verify | ON after PW recording smoke |
| **042** | Same as 057 / prior v3.0 | ON after gate recording smoke |
| **101** | **ON** (unchanged) | Stay ON |
| Email / Make / 118–119 | **OFF** / untouched | Out of scope |

---

## 14. Smoke-test plan

Use a **non-production athlete / isolated enrollment** if available; otherwise a carefully chosen low-risk fixture with Mike approval.

| ID | Scenario | Expect |
|----|----------|--------|
| S0 | Schema re-audit | Curated blockers = 0; formulas yield key + amount 30 |
| S1 | Recording Quiz approved, no live sibling | XP created `ZOOM_CREDIT|…`, 30 XP, bucket/source correct; **Attendees unchanged** |
| S2 | Rerun 117 | `skipped_exists` / no duplicate |
| S3 | Live + recording same meeting | Conflict / soft-void recording or skip; **live XP untouched** |
| S4 | 057 recording-only week | WAS zoom attendance counts recording once; `Perfect Week Credit Applied?` set by 057; Attendees unchanged |
| S5 | 042 recording gate credit | Effective zoom count includes recording; `Gate Credit Applied?` set by 042; Attendees unchanged |
| S6 | Live-only control | 101 behavior unchanged |

---

## 15. Rollback plan

1. Keep **117 OFF**; re-disable 057/042 if newly enabled versions misbehave — re-paste prior 057/042 from git.  
2. Soft-void bad `ZOOM_CREDIT|…` (`Active? = false`) — **do not delete** ledger rows.  
3. Clear Applied? flags on ZA if needed.  
4. **Do not** remove live Attendees or live XP.  
5. Schema rollback of a new table is painful — prefer leaving ZA empty/OFF over deleting the table after data exists.

---

## 16. Stop conditions

Stop promotion / enablement if any of the following occur:

- Zoom Attendance still missing or formulas not producing `ZOOM_CREDIT|…` / amount 30  
- Any script writes `Zoom Meetings.Attendees` for recording  
- New live `ZOOM_ATTEND_BASE|…` XP appears from a recording-only test  
- Valid historical live XP deactivated or deleted  
- `ZOOM_ATTEND_BASE` amount changed away from 60 without Mike approval  
- DEV one-click / downstream verification still failing (see existing PROD promotion STOP docs)  
- Attempt to use Make / Gmail / Softr / Bracket App as part of this package  

---

## 17. Unknowns requiring manual Airtable inspection

These were **not** fully proven by API meta/record reads alone:

1. **Exact PROD automation script versions** currently installed for 057 / 042 / 101 / any 117 slot (Automations API often 403).  
2. **Formula correctness after recreate** — DEV formulas use field IDs; PROD rebuild must be visually confirmed in OMNI.  
3. **Which Config row is global default in PROD** after fields are added (which row gets percent = 50).  
4. **Whether meeting-level overrides are required on day one** or global Config Effective* alone is enough.  
5. **Interface / Softr / form intake** that creates Zoom Attendance rows (if any) — out of this API audit.  
6. **View filters** for `Zoom Recording Quiz - Past Deadline` (filter formula not exported in detail here).  
7. **Permission / sync** differences for `Program Instance - Synced` affecting Config linkage.  
8. **Historical desire for retroactive recording credit** — product decision, not schema.  
9. **ETF / Testing Scenarios** — confirm product does **not** want Testing Scenarios table in PROD.  
10. **Live confirmation** that no hidden/renamed ZA table exists outside Meta API (extremely unlikely; Meta listed all 29 PROD tables).

---

## Concise Production promotion checklist (do **not** execute)

- [ ] Mike approves schema migration plan (this doc)  
- [ ] DEV Stage 17 one-click / downstream verification **Pass** (separate gate)  
- [ ] OMNI: Config Stage 17 fields + values (50%)  
- [ ] OMNI: Zoom Meetings Stage 17 support fields (no ZZZ archives)  
- [ ] OMNI: Create Zoom Attendance + formulas + views  
- [ ] OMNI: Links Enrollments / Zoom Meetings ↔ ZA  
- [ ] OMNI: XP Source option `Zoom Meeting Recording Quiz`  
- [ ] Re-run read-only gap audit → curated blockers = 0  
- [ ] Save PROD script rollback copies for 057 / 042  
- [ ] Paste **117 v1.1.1** — leave **OFF**  
- [ ] Paste **057 v1.3** — leave **OFF** until smoke  
- [ ] Paste **042 v3.1** — leave **OFF** until smoke  
- [ ] Smoke S1–S6 on isolated fixture  
- [ ] Enable 057 → 042 → 117 gradually with monitoring  
- [ ] Confirm 101 unchanged; Attendees never written by recording path  
- [ ] CHANGELOG + promotion close-out  
- [ ] **Do not** merge this audit branch as a substitute for migration work  

---

## Safety confirmation

| Base | Touched? |
|------|----------|
| DEV `appTetnuCZlCZdTCT` | **Untouched** (read-only) |
| PROD `appn84sqPw03zEbTT` | **Untouched** (read-only) |
| Make / Gmail / Softr / Bracket App | **Not accessed** |
| Automations enabled / pasted | **No** |

---

## Related docs

- [C-025-stage17-zoom-recording-dev-installation-packet.md](./C-025-stage17-zoom-recording-dev-installation-packet.md)  
- [C-025-stage17-perfect-week-level-gate-dev-installation-packet.md](./C-025-stage17-perfect-week-level-gate-dev-installation-packet.md)  
- [C-025-stage17-prod-promotion-STOP-2026-07-18.md](./C-025-stage17-prod-promotion-STOP-2026-07-18.md)  
- PASTE: 117 v1.1.1 · 057 v1.3 · 042 v3.1 under `docs/deploy-checklists/`
