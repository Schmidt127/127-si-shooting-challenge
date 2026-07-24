# Finishing Forecast — Agent 13

**Date:** 2026-07-24  
**Method:** Item counts + dependency chains from Completion Master (146 total). No unsupported completion percentages.

---

## Current state (post Agent 13)

| Bucket | Count |
|--------|------:|
| Complete | 10 |
| Live Tested in PROD | 6 |
| Installed in PROD | 51 |
| Built in Repository | 34 |
| Planned | 23 |
| Decision Needed | 7 |
| Deferred | 10 |
| Superseded | 3 |
| Not Needed | 2 |
| **Total** | **146** |

**Not finished (actionable):** Complete+LT+Installed+Built+Planned+Decision = 10+6+51+34+23+7 = **131** tracked as unfinished or partial; of these, **Deferred (10) + Superseded (3) + Not Needed (2)** are intentionally parked → **~116 actively unfinished**.

---

## Remaining work by lane

### 1. Repository work (no Airtable UI)

| Cluster | SC / work | Dependency |
|---------|-----------|------------|
| Config consumer migration | Wire tools/automations to `lib/config-selection` | Agent 10 contract |
| Hardcode finish pass | Remaining literals 001–119 (SC-034) | After pastes |
| Ownership enforcement | SC-047 after Mike decisions on OW-D* | Agent 9 matrix |
| LA automation stubs | After schema auth (SC-018–020) | Mike schema |
| Web Presentation wiring | SC-117 after SC-054 schema | Schema wave |
| Stale doc finish | Remaining STALE-063-111 patch rows (audits) | Low risk |
| Web deps + Playwright CI | SC-118 execution | Mike authorize npm |

**Estimate:** ~8–12 focused Cursor sessions after decisions/pastes land.

### 2. Airtable UI work

| Cluster | Items | Notes |
|---------|-------|-------|
| Automation attestation | SC-058/059 | Packet ready |
| Testing views | SC-003 | API cannot create |
| Pastes | 054 v5.6, 066 v3.3, 118/119 v1.3 OFF | Scripts in Git |
| Formula fix | XP Date Resolved case | Agent 2 #3 |
| Config year links | Zoom Global/Program Config | OMNI |
| Threshold hunt | XP-D1 | Find or confirm missing |
| Weeks seed | SC-065 | Manual by design |
| Tutorials migration | SC-052/053 | After Softr proof |

**Estimate:** 1–2 Mike UI sessions for attestation+pastes; separate sessions for views/Weeks/schema.

### 3. Make / Fillout work

| Cluster | Items |
|---------|-------|
| Weekly email Test webhook | SC-039 after 119 paste |
| 117f permanent webhook / go-live | SC-088 |
| Homework Module 2 Make checklist | SC-101 / SC-095 |
| Fillout enrollment tighten | SC-060–063 when SC-146 reopen approaches |
| Quiz Fillout mapping | Only if SC-014 Option A |

**Estimate:** 3–5 Make/Fillout operator sessions; gated on decisions.

### 4. Product decisions (must precede some builds)

Open Decision Needed (7): **SC-014, SC-035, SC-044, SC-066, SC-081, SC-112, SC-114/115** (114/115 counted as pair in master table — verify master lists 7 rows).

Plus engineering choices not in DN column: **117 XOR 117c**, **Count It dual-writer**, **Threshold rebuild**, **070a ON timing (SC-095)**.

**Estimate:** One ChatGPT decision sprint can clear the email/quiz/Zoom writer cluster; auth/Softr can wait.

### 5. Controlled live tests (Schmidt)

Critical path after installs:

1. Daily path already proven (115/010) — expand HW/Video/Zoom  
2. Homework chain SC-009–017  
3. Video SC-072/094/099  
4. Zoom live+recording exclusivity SC-073/074/087  
5. Streak/milestone/Perfect Week SC-075–077  
6. Gate block/clear SC-079/080  
7. Weekly email dryRun→Test SC-035–040  
8. Full matrix SC-005 / dry-run season SC-135  

**Estimate:** ~15–25 named Schmidt scenarios remaining; several require multi-day streak construction.

### 6. Website / release work

| Item | Status |
|------|--------|
| Catalogs / standings / security | Installed; spot-check after content seed |
| Game manual config | Built — editorial review |
| Athlete auth / real profiles | Blocked on SC-112 |
| Softr cutover / noindex | Blocked on SC-114/115 |
| Admin diagnostics | Built roadmap only |
| Playwright green in CI | Blocked on install auth |

---

## Dependency chains (critical path)

```
UI attestation (112/117xor/063/111)
    → paste 054/066 + 118/119 OFF
        → SC-014 quiz decision
            → homework + quiz live tests
                → LA schema auth (SC-018+)
        → SC-035 email decision
            → 118 dryRun Schmidt
                → authorize schedules (later)
    → sole Zoom writer
        → recording + gate + Perfect Week live
Config year-aware adoption (parallel, non-destructive)
Web npm install (parallel) → Playwright → release confidence
SC-112/114/115 (parallel, not on XP critical path)
```

---

## Forecast by exit criteria (not %)

| Milestone | What “done” means | Approx. remaining SC-shaped work |
|-----------|-------------------|----------------------------------|
| **M1 Attestation + pastes** | UI list signed; 054/066/118/119 OFF pasted; Config collapse rejected | ~6 P0 actions |
| **M2 Core athlete paths live** | HW + video + Zoom exclusivity + weekly dryRun on Schmidt | ~20 Installed→Live Tested promotions |
| **M3 Decision clearance** | SC-014/035/044 (+ Zoom writer) recorded | 4–5 decisions |
| **M4 Season readiness** | Weeks seeded; Fillout still OFF until SC-135; gates tuned | SC-065/082/135 cluster |
| **M5 Public readiness** | Auth/Softr/noindex decided; Presentation fields; Playwright CI | SC-112/114/115/054/117/118 |

**Deferred intentionally:** SC-042 EMC, SC-067 Program Instance wave, SC-100 Drive retirement, SC-131–132 media platform, SC-143 multi-challenge — not on critical path to next-season intake.

---

## Honesty bounds

- **51 Installed** items are not “almost Complete” — each needs Schmidt re-proof.  
- **34 Built** items need PROD install and/or live proof.  
- Decision packets ≠ decisions.  
- Offline green ≠ Live Tested.
