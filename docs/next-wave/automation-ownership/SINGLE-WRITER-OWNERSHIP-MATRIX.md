# Single-Writer Ownership Matrix — Agent 9

**Generated:** 2026-07-24  
**Classifications:** `authoritative_writer` · `repair_only_writer` · `orchestrator` · `legacy_off` · `duplicate_risk` · `evidence_insufficient`

Rule: Do **not** silently choose an owner when evidence is insufficient. Mark `evidence_insufficient` or `duplicate_risk` and require Mike attestation / product decision.

---

## 1. Explicit conflict resolutions

### 1.1 Video Feedback create — 013 versus 112

| Item | Decision |
|------|----------|
| Identity | One VF per video Submission Asset |
| Canonical key | `VIDEO_FEEDBACK\|{submissionAssetId}` (**013**) |
| Legacy key | Raw `{submissionAssetId}` (**112**) — incompatible |
| Classification | **013** = `authoritative_writer` · **112** = `legacy_off` |
| Required state | **112 OFF** (attest). Do not re-enable. |
| If both ON | Asset may remain unlinkable to 013’s key → second VF → duplicate `VIDEO_SUBMISSION\|` XP via 114 |
| Evidence | automation-index Stage G; CORE-UNIQUENESS; script key builders |

### 1.2 Homework Completions — 020 versus deleted 063

| Item | Decision |
|------|----------|
| HC create | **020** = `authoritative_writer` |
| Grade Band at create/repair | **020** owns (create + blank repair) |
| **063** | `legacy_off` — overnight docs attest PROD delete; GitHub file remains for history |
| Classification if 063 reappears ON | `duplicate_risk` until retired again |
| Evidence | CURRENT-CONFIG-BASELINE Grade Band propagation; MIKE-ACTIONS delete set |

### 1.3 WAS create — 031 versus 101 versus 118

| Writer | Role | Classification |
|--------|------|----------------|
| **031** | Primary create from counted Submission | `authoritative_writer` for submission-driven WAS |
| **101** | Side-effect create when awarding live Zoom XP | `duplicate_risk` (necessary side-create; race-prone) |
| **118** | Batch ensure WAS before weekly email | `duplicate_risk` / keep **OFF** until authorized |

| Contract | One WAS per **Enrollment + Week** |
|----------|-----------------------------------|
| Formula | `Summary Key` — **never write** |
| Resolution | 031 remains primary. 101 may create only when none exists for live Zoom. 118 must stay OFF until race mitigation + Mike auth. Concurrent creates remain a race (no DB unique index). |
| Cleanup | Throw/skip on multiples when detected; no automated merge overnight |
| Evidence | CORE-UNIQUENESS; Schmidt 1 WAS despite 3 submissions; code paths |

**Unresolved:** Whether 101 WAS create should be removed in a future change (product/engineering) — **not decided here**.

### 1.4 Zoom recording credit — 117 versus 117c

| Item | Decision |
|------|----------|
| Effect | Exactly one `ZOOM_CREDIT\|{enrollmentId}\|{meetingId}` XP Event |
| Classification | Both = `duplicate_risk` until attestation |
| Required | **Exactly one** of 117 or 117c ON for XP create |
| Preferred shape (repo intent) | **117 orchestrator** owns end-to-end when installed; modular **117c** OFF in PROD |
| Proof status | **evidence_insufficient** for live UI exclusivity — Mike must attest |
| Disjoint | Live 101 uses `ZOOM_ATTEND_*` only |

### 1.5 XP writers — 010 / 054 / 057 / 059 / 064 / 065 / 066 / 101 / 114 (+ unlocks)

| Domain | Authoritative XP writer | Supporting | Classification |
|--------|-------------------------|------------|----------------|
| Submission base | **010** | — | authoritative_writer |
| Streak XP | **054** | 053/055/056 occurrences | authoritative_writer |
| Perfect Week eligibility | — | **057** orchestrator | orchestrator |
| Perfect Week unlock | **058** (unlock) → **059** (XP) | — | authoritative_writer |
| Shot milestone | **066** (unlock) → **059** (XP) | — | authoritative_writer |
| Homework XP | **065** | **064** prepare | authoritative_writer + orchestrator |
| Video XP | **114** | **113** base amount | authoritative_writer + orchestrator |
| Zoom live | **101** | — | authoritative_writer |
| Zoom recording | **117 XOR 117c** | 117a/d/e flags | duplicate_risk |
| Weekly threshold | **MISSING** | 072 reads buckets | evidence_insufficient |
| Manual bonus | Manual / ops | Lifetime adjust field | evidence_insufficient |

**064** does not create XP Events. Rule key `HOMEWORK_COMPLETION` is XP Reward Rules config — not the legacy Source Key prefix.

### 1.6 Make scenarios overlapping Airtable writers

| Make surface | Airtable fields also written by | Classification |
|--------------|---------------------------------|----------------|
| Upload asset engine | Canonical URL, hash, Upload Status, Writeback Complete? (022 / 070c / Lambda) | `duplicate_risk` — sequenced handoff, not dual-create of business records |
| 117f approval email | Send key/status owned by **117f**; Make must **not** write XP Events or Attendees | Make = `orchestrator`/email; Airtable 117f = authoritative for send key |
| Weekly email Make (`Weekly Athlete Summary - Bulk Email - May 18`) | Live branch writes `Weekly Email Sent?`, `Make Send Status=Sent`, sent timestamp; **074 must not clear Sent?** | `authoritative_writer` = **Make Live** (`verified_prod` 2026-07-24). PROD 074 must use **Live**. Daily 077 still attest separately. |

---

## 2. Identity ownership matrix (by destination identity)

| Identity | Authoritative owner | Allowed secondary | Forbidden |
|----------|--------------------|-------------------|-----------|
| XP `SUBMISSION_XP\|{sub}` | 010 | repair backfills (gated) | Second live creator |
| XP `HOMEWORK_XP\|{hc}` | 065 | legacy cleanup backfill | New `HOMEWORK_COMPLETION\|` mints |
| XP `VIDEO_SUBMISSION\|{vf}` | 114 | 116 Active? only | Second XP mint |
| XP `STREAK_XP\|…` | 054 | — | — |
| Unlock `SHOT_MILESTONE\|…` | 066 | 059 XP from unlock | Writing Unlock Key formula |
| Unlock `PERFECT_WEEK\|…` | 058 | 059 XP | — |
| XP `ZOOM_ATTEND_*` | 101 | — | Recording path |
| XP `ZOOM_CREDIT\|…` | **one of** 117/117c | — | Both ON |
| VF `VIDEO_FEEDBACK\|{asset}` | 013 | — | 112 ON |
| HC Submission+Homework+slot | 020 | 067 quiz only (open) | Dual create same assignment without product rule |
| WAS Enrollment+Week | 031 primary | 101 side-create; 118 OFF | Uncontrolled concurrent creates |
| Enrollment Current/Next Level | 042 | 041 flag only | Other level writers |
| Email `WEEKLY_EMAIL\|…` | 074 (+072 build) | 118/119 OFF until auth | Double-send |
| Email `ZOOM_REC_EMAIL\|…` | 117f | Make email delivery | Make XP/Attendees writes |

---

## 3. Classification summary table

| Automation | Classification | Owner of |
|------------|----------------|----------|
| 010 | authoritative_writer | Submission XP |
| 013 | authoritative_writer | Video Feedback create |
| 020 | authoritative_writer | Homework Completion create |
| 031 | authoritative_writer | WAS from Submission |
| 041 | orchestrator | Level recalc flag |
| 042 | authoritative_writer | Enrollment levels |
| 053 | authoritative_writer | Streak Occurrences |
| 054 | authoritative_writer | Streak XP |
| 057 | orchestrator | Perfect Week eligibility |
| 058 | authoritative_writer | Perfect Week unlock |
| 059 | authoritative_writer | Unlock → XP |
| 063 | legacy_off | (deleted) Grade Band repair |
| 064 | orchestrator | Homework XP prep |
| 065 | authoritative_writer | Homework XP |
| 066 | authoritative_writer | Shot milestone unlock |
| 067 | duplicate_risk | Quiz HC path |
| 072 | authoritative_writer | Weekly email package |
| 074 | authoritative_writer | Weekly email send key |
| 076/077 | authoritative_writer | Daily email |
| 101 | authoritative_writer (XP) + duplicate_risk (WAS side-create) | Live Zoom XP |
| 111 | legacy_off | (deleted) VF Grade Band |
| 112 | legacy_off | VF create duplicate |
| 113 | orchestrator | Base video XP amount |
| 114 | authoritative_writer | Video XP |
| 116 | orchestrator | Reuse consequences |
| 117 | duplicate_risk until attest | Zoom credit XP (candidate) |
| 117c | duplicate_risk until attest | Zoom credit XP (candidate) |
| 117f | authoritative_writer | Zoom approval send key |
| 118 | duplicate_risk / OFF | Batch WAS + build arm |
| 119 | orchestrator / OFF | Send arm |
| WEEKLY_THRESHOLD | evidence_insufficient | Missing writer |
| Make upload engine | duplicate_risk (field handoff) | Asset upload fields |

---

## 4. What is proven vs open

### Authoritative owners proven (repo + overnight evidence)

- 010 submission XP  
- 013 VF create (canonical key)  
- 020 HC create (submission path)  
- 031 WAS primary from submission  
- 042 levels  
- 054/058/059/066 unlock+XP chains (code)  
- 065 homework XP modern key  
- 101 live Zoom XP family  
- 114 video XP  
- 112 must be OFF (contract)  

### Unresolved ownership (do not invent)

1. **117 XOR 117c** live exclusivity — Mike attest  
2. **020 vs 067** HC product rule (SC-013/014)  
3. **Weekly Threshold XP** writer existence in Airtable UI  
4. **101 WAS side-create** long-term retention  
5. **Make writeback** for **weekly** email: resolved (`verified_prod` 2026-07-24) — Make Live owns Sent?/status/timestamp; 074 owns webhook only. **Daily 077** / 022 still attest separately.  
6. **118/119** schedules OFF until checklist; Automations operator table (2026-07-23) omitted them.  
