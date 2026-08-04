# Shooting Challenge Remaining Work Audit

| Field | Value |
|-------|--------|
| Audit date | **2026-08-04** |
| Controlling source | [`docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](../../SHOOTING_CHALLENGE_COMPLETION_MASTER.md) |
| Environment | Airtable PROD `appn84sqPw03zEbTT` (active construction/testing per master §1) |
| Scope | Application + Airtable/automation ecosystem — not general website redesign |
| Method | Research and planning only — **no** status updates, pastes, installs, commits, or production mutations |
| Companion checklist | [`SHOOTING-CHALLENGE-NEXT-ACTIONS.md`](./SHOOTING-CHALLENGE-NEXT-ACTIONS.md) |

**Label legend used below:** **Fact** = supported by master/repo evidence · **Conflict** = docs disagree with master · **Inference** = reasoned but not live-verified · **Proposed** = recommended change (not applied)

---

## 1. Executive summary

Shooting Challenge V2 is **not season-ready**. Independently recounting Section 4 yields **149** SC items with **121 active incomplete** items (Decision Needed + Planned + Built + Ready-for-Paste + Installed + Live Tested with residual close-out). Only **12** are Complete.

The shortest safe path is not “build more features.” It is:

1. **Stop following stale OFF/DEV-first/Softr/hoopchallenges guidance** (High conflict set — §12).
2. **Close foundation gaps Mike alone can finish** — automation UI attestation, Testing views, paste packages (067, 057 v1.4), enable decisions (035 OFF→ON when approved).
3. **Re-prove athlete paths on Schmidt** after the empty-base reset (homework → video → Zoom → streak/milestone → Perfect Week → gates → non-weekly emails).
4. **Season launch control** (Weeks import, Fillout gates, dry-run SC-135) before reopening intake (SC-146 Deferred).

Public `/shoot` is further ahead than the athlete pipeline: SC-102/103/106/108/111/113 are Live Tested; SC-148/149/118 are Built (merged via PRs #52–#55/#58) pending honest Vercel/env confirmation. **Fact:** SC-111 plaque follow-up remains Built only — not Live Tested in PROD.

**Dashboard discrepancy (Fact):** Master dashboard claims Built **29** / Planned **21**. Independent recount: Built **28** / Planned **20**, plus **SC-021** as informal **Ready for PROD Paste** (not a formal bucket). Counts otherwise match.

**Cannot verify live Airtable/Make/Vercel dashboard state from this audit environment** (no PAT / agent token — see `docs/prod-completion/2026-07-25/ACCESS-BLOCKER.md`). PROD ON/OFF claims below are taken from the completion master and dated evidence docs, not fresh UI readback.

---

## 2. Current completion dashboard (independently recalculated)

Source: all `| SC-… |` rows in master §4 (149 unique IDs, SC-001…SC-149, no gaps).

| Bucket | Master dashboard (2026-08-04) | Independent recount | Delta |
|--------|------------------------------:|--------------------:|------:|
| Total items | 149 | 149 | 0 |
| Complete | 12 | 12 | 0 |
| Live Tested in PROD | 16 | 16 | 0 |
| Installed in PROD | 51 | 51 | 0 |
| Built in Repository | **29** | **28** | **−1** |
| Planned | **21** | **20** | **−1** |
| Decision Needed | 5 | 5 | 0 |
| Deferred | 10 | 10 | 0 |
| Superseded | 4 | 4 | 0 |
| Not Needed | 2 | 2 | 0 |
| Brainstormed | 0 | 0 | 0 |
| **Ready for PROD Paste** *(informal; SC-021 only)* | *(not listed)* | **1** | orphan |

**Math check:** 12+16+51+28+20+5+10+4+2+1 = **149**.

**Active incomplete (this audit definition):** all buckets except Complete, Superseded, Not Needed, Deferred → **121**. Deferred (10) are appendix-only unless Mike reopens them.

### Status honesty flags

| Item | Claim | Risk | Evidence |
|------|-------|------|----------|
| SC-021 | Ready for PROD Paste | Not in formal dashboard — easy to drop from counts | Master §4 SC-021 |
| SC-028 / SC-077 / SC-091 | Installed in PROD | Honest for **057 v1.3**; repo **v1.4** still paste-pending | `057-perfect-week-denver-v1.4.md`; master |
| SC-049 | Live Tested in PROD | Strong Schmidt proof; automation **remains OFF** — not season-enabled Complete | `docs/testing/evidence/2026-08-03-035-v1.2-schmidt-live-proof.md` |
| SC-111 | Live Tested in PROD | Core profiles LT; **plaque follow-up Built only** | plaque evidence folder 2026-08-04 |
| SC-148 / SC-149 | Built in Repository | PRs #52/#54/#55 merged; treat Installed only after Vercel Production + Mike check (**Inference:** auto-deploy may have shipped — verify) | master §9F/9H; gh PR list |
| SC-118 | Built — smoke executed vs PROD | Smoke ≠ package Installed/Live Tested | `PRODUCTION-SMOKE-2026-08-04.md` |
| SC-002 | Installed in PROD | SCN-001–020 installed; **021–043 Built only**; several 001–020 still not fully executed | `PROD-INSTALL-EVIDENCE-2026-07-25.md` |
| Master table pipes | SC-040 / SC-072 columns | Escaped `\|` in cells breaks naive parsers — priority/needed columns can shift | master §4 |

---

## 3. Immediate blockers

| # | Blocker | Why it blocks | Owner | SC |
|---|---------|---------------|-------|-----|
| B1 | **Automation UI attestation incomplete** | Cannot trust one-writer rules, 112 OFF, 117 XOR 117c, deleted-set claims | Mike (Airtable UI) | SC-058, SC-059, SC-046 |
| B2 | **Testing views mostly missing** | API cannot create views; Schmidt ops visibility incomplete | Mike / OMNI | SC-003 |
| B3 | **Athlete-path re-proof incomplete after wipe** | Installed ≠ Live Tested for HW/video/Zoom/streak/milestone/gates | Mike + Cursor (with PAT) | SC-009–017, 071–080, 084–091 |
| B4 | ~~067 Option B not confirmed pasted / live-tested~~ | **CLOSED 2026-08-04** — Live Tested (SC-013/014) | Evidence `docs/testing/evidence/2026-08-04-package-02-critical-pastes/` | SC-013, SC-014 |
| B5 | **057 v1.4 not pasted** | PROD still on v1.3 per master; Denver date-key risk | Mike paste | SC-021, SC-028, SC-077, SC-091 |
| B6 | **035 Live Tested but OFF** | Weekly threshold XP not season-enabled | Mike enable after reconcile | SC-049 |
| B7 | **070a homework S3 intentionally OFF** | Photo/PDF HW upload path incomplete until authorized | Mike decision SC-095 | SC-095, SC-009/010 |
| B8 | **Season launch not live-installed** | Weeks import / Launch Status / Fillout gates unfinished | Mike + repo CLI | SC-032, SC-065 |
| B9 | **Stale docs still instruct 118/119 OFF & DEV-first** | Wrong operator actions | Doc refresh SC-139 | — |
| B10 | **Agent Airtable PAT often missing** | Blocks unattended Schmidt mutation proofs | Mike env | ACCESS-BLOCKER |

---

## 4. Decision-needed items

### Formal Decision Needed status (5)

| ID | Decision | Blocks | Master recommendation / notes |
|----|----------|--------|-------------------------------|
| **SC-044** | Major-event alerts: SMS vs email; parent vs athlete; opt-in | Non-weekly milestone/level-up comms | Product/comms policy — can defer past single-athlete dry-run |
| **SC-066** | Early-bird for 2026–27? | Calendar/config only if Yes | P3 — do not block core paths |
| **SC-081** | Change streak repeat-after-break, or amounts only? | Behavior code vs config | Amounts already in XP Reward Rules |
| **SC-112** | Athlete auth approach | Real dashboard (not demo) | Recommend parent magic-link; issues #56/#57 open |
| **SC-115** | Remove sitewide noindex? | Public SEO | Keep noindex until content ready; issue #56/#57 |

### Additional decisions still called out in master / overnight (not always Decision Needed status)

| Topic | Source | Notes |
|-------|--------|-------|
| Video XP live **1** vs rule **25** | SC-022 / overnight config MIKE-ACTIONS | **Ambiguous** — confirm intentional vs repair |
| Zoom Recording / Manual Bonus rule records | SC-022 | Config cleanup |
| Lifetime XP excluding Zoom Recording Quiz 30 | overnight MIKE-ACTIONS | **Ambiguous** — map under SC-022 |
| Submission formula XP vs SHOOTING_BASE=20 | overnight MIKE-ACTIONS #7 | Competing economics — treat under SC-021/022 |
| Confirm Airtable Scenario Library table still wanted | SC-002 Mike Decision column | Testing investment |
| Auto Expected-vs-Actual writeback now? | SC-006 | Optional P2 |
| When to ON **070a** | SC-095 | Decision Needed content; status is Built |
| When to schedule Program Instance | SC-067 Deferred | Do not block launch |
| When to reopen Fillout intake | SC-146 Deferred | After SC-135 |
| 117 XOR 117c; 112 OFF | SC-058/059 | Attestation, not product design |
| Authorize Learning Activities schema | SC-018 | Schema create |
| Authorize Season Launch Status fields | SC-032 | Schema / activation |
| Enable **035** after PR #50 reconcile | SC-049 | Season enable |
| Fairfield Vercel env confirmation | SC-149 | Ops verify |
| Brand Standards cross-repo sync | master §9F | **Proposed new follow-up** — no SC ID yet (§13) |

---

## 5. Prioritized package roadmap

Packages are ordered for **dependency safety** and **launch impact**, not merely the Priority column.

| Pri | Package | SC IDs (core) | Risk | Why now |
|----:|---------|---------------|------|---------|
| **P0** | P01 Foundation attestation + Testing views | SC-003, SC-046, SC-058, SC-059 | Med | Unlocks trustworthy testing |
| **P0** | P02 Paste + enable critical automations | SC-013/014, SC-021/028/077, SC-049 | Med–High | Closes known PROD/repo drift |
| **P0** | P03 Homework E2E re-proof (Schmidt) | SC-009–017, SC-071, SC-016 | Med | Core athlete path |
| **P0** | P04 Video + S3 writeback re-proof | SC-011, SC-072, SC-094–099 | Med | Storage chain |
| **P0** | P05 Zoom live + recording exclusivity | SC-073/074, SC-084–091 | High | Dual-credit risk |
| **P0** | P06 Streak / milestone / Perfect Week / gates | SC-027/029, SC-075–080 | Med | Progression integrity |
| **P0** | P07 Weekly email season arming residual | SC-031/035/036/045, SC-041 | Med | Schedules ON; paste/monitor residuals |
| **P0** | P08 Season launch + Weeks | SC-032, SC-065, SC-068 | Med | Required before multi-athlete |
| **P0** | P09 Full Schmidt dry-run matrix | SC-005, SC-007, SC-008, SC-135 | Med | Gate before intake |
| **P1** | P10 Enrollment/Fillout live proof | SC-060–064, SC-146 later | Med | Multi-athlete readiness |
| **P1** | P11 XP config cleanup | SC-022, SC-023, SC-034 | Low–Med | Rule honesty |
| **P1** | P12 Parent Presentation fields | SC-043, SC-054, SC-117 | Med | Parent-safe labels |
| **P1** | P13 070a homework S3 ON (if approved) | SC-095, SC-101 | High | Mike-gated |
| **P1** | P14 117f Zoom approval email go-live | SC-088 | Med | Webhook permanent |
| **P1** | P15 RCC MVP views | SC-147 | Low | Ops visibility |
| **P1** | P16 Scenario library expand | SC-002 (021–043), SC-006 | Low | Repeatable suites |
| **P1** | P17 Web Fairfield + a11y + smoke deploy confirm | SC-148, SC-149, SC-118, SC-109 | Low | Public surface |
| **P2** | P18 Catalog hygiene / Game Manual PDF | SC-104–107, SC-109–110 | Low | Content polish |
| **P2** | P19 Stale-doc sweep | SC-139 | Low | Prevent wrong installs |
| **P2** | P20 Learning Activities wave | SC-018–020 | Med | After HW stable |
| **P3** | P21 Deferred reopen review | SC-042,066,067,100,112,115,131… | — | Only if Mike prioritizes |

---

## 6. Complete active-item table

Full authoritative rows remain in the completion master. This section lists **every active incomplete ID** with audit disposition.

### 6.1 Decision Needed (5)

| ID | Area | Pri | Disposition |
|----|------|-----|-------------|
| SC-044 | Weekly Summary | P2 | Decision before build; not single-athlete blocker |
| SC-066 | Enrollment | P3 | Decision; defer OK |
| SC-081 | XP | P2 | Decision; amounts already configurable |
| SC-112 | Website | P2 | Decision; demo dashboard acceptable for season start if Mike accepts |
| SC-115 | Website | P2 | Decision; keep noindex until approved |

### 6.2 Ready for PROD Paste (1)

| ID | Area | Pri | Disposition |
|----|------|-----|-------------|
| SC-021 | Config | P0 | Paste **057 v1.4**; treat as Built/Ready — **Proposed:** map into Built bucket after paste or rename status |

### 6.3 Planned (20)

| ID | Pri | Still needed (audit summary) |
|----|-----|------------------------------|
| SC-003 | P0 | Mike create Testing views (Schmidt filter) |
| SC-005 | P0 | Execute remaining E2E matrix |
| SC-008 | P1 | Failure-path Make/Lambda/email tests |
| SC-020 | P1 | countsAsHomework flag + filters (after SC-018/019) |
| SC-033 | P2 | Operator switch inventory |
| SC-043 | P1 | Presentation fields in weekly email |
| SC-047 | P0 | Enforce one writer after SC-046 decisions |
| SC-048 | P0 | Fresh computed-field review |
| SC-051 | P2 | Obsolete field cleanup |
| SC-053 | P2 | Tutorials merge (after SC-052) |
| SC-054 | P1 | Public Presentation fields schema |
| SC-057 | P1 | Trigger duplicate review |
| SC-082 | P2 | Early gate number tuning |
| SC-117 | P1 | Web consumes Presentation fields |
| SC-133 | P2 | Pre-season parent comms |
| SC-134 | P1 | Pre-season audit pack green |
| SC-135 | P0 | Full Schmidt dry-run before intake |
| SC-138 | P2 | Close overnight GitHub issues #1/#8/#9/#11/#17 |
| SC-144 | P2 | Rename Softr-named publish flag |
| SC-145 | P2 | Repo health/security triage |

### 6.4 Built in Repository (28)

| ID | Pri | Still needed (audit summary) | Repo evidence check |
|----|-----|------------------------------|---------------------|
| SC-006 | P2 | Optional Airtable score writeback | `tools/testing/` exists |
| SC-013 | P0 | Paste 067 + Schmidt Option B live | Script 067 v2.0; install at `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md` (**path often mis-cited**) |
| SC-014 | P0 | Same as SC-013 | Option B decided |
| SC-018 | P1 | Authorize LA schema | Schema MD exists |
| SC-019 | P1 | LAR routing automations | Contract exists |
| SC-032 | P0 | Import Weeks; authorize launch fields | `docs/challenge-year/SEASON-LAUNCH-CONTROL.md` |
| SC-034 | P1 | Finish hardcode migration pastes | Audit docs exist |
| SC-041 | P1 | Controlled fail→recover live | SCN-029 + retry SOP |
| SC-046 | P0 | Mike attest dual-writer fixes | `docs/overnight/testing-integrity/FIELD-WRITER-AUDIT.md` |
| SC-050 | P1 | Use safe-backfills when needed | Extensions exist |
| SC-052 | P2 | Live orphan Tutorials audit | online-agents package |
| SC-056 | P1 | I/O drift inventory | Standard exists |
| SC-058 | P0 | Paste full UI automation list | Attestation packet |
| SC-060–064 | P1–P2 | Live Fillout/enrollment proofs | online-agents enrollment package |
| SC-065 | P0 | Import generated Weeks | Challenge-year CLI |
| SC-068 | P0 | Active? guards + Schmidt email conflict resolve | Partial |
| SC-088 | P1 | Permanent 117f webhook + go-live | Built; webhook often blank |
| SC-095 | P0 | Authorize 070a ON | Script 070a v4.4; PROD OFF by design |
| SC-116 | P3 | Staff auth for admin | Roadmap only |
| SC-118 | P2 | Optional CI; Mike post-deploy check | Smoke evidence 2026-08-04 |
| SC-139 | P1 | Continue stale-doc sweep | Partial 2026-07-25 pack |
| SC-147 | P0 | PROD export + OMNI views | RCC MVP packet; fixtures archived |
| SC-148 | P1 | Confirm Production deploy + Mike check | PR #54/#55 merged |
| SC-149 | P0 | Confirm Fairfield Vercel env + smoke | PR #52/#55 merged |

### 6.5 Installed in PROD — needs Schmidt re-proof (51)

Grouped by path (all status **Installed**, not Live Tested, unless noted):

| Path | SC IDs | Critical residual |
|------|--------|-------------------|
| Testing library | SC-002 | Install SCN-021–043; execute matrix |
| Homework | SC-009–012, 015–017 | Photo/PDF/video/written/multi-file/one-HC/review→XP→email |
| Config | SC-022–030 | Rules/bands/levels/gates/achievements/milestones/PW/streak/Zoom% — many need live proof; **028 needs 057 v1.4 paste** |
| Weekly summary calcs | SC-036, SC-037, SC-045 | Calcs + non-weekly email types |
| Legacy retirement | SC-059 | UI-attest 112 OFF |
| XP sources | SC-071–077, SC-079–080, SC-083 | HW/video/Zoom/streak/milestone/PW/gates/achievements |
| Zoom | SC-084–087, SC-089–093 | Attendance, recording, exclusivity, formulas, web |
| Assets | SC-094, SC-096–099, SC-101 | Video S3, URLs, hash, reuse, 070c, Make routing |
| Website catalogs | SC-104,105,107,109,110 | Content hygiene + PDF env |

### 6.6 Live Tested — residual close-out (16)

| ID | Residual before treating as “done enough for season” |
|----|------------------------------------------------------|
| SC-001 | Expand HW/Video 115 branches; optional SCRIPT v1.9 paste (docblock still v1.8) |
| SC-004 | Keep Schmidt-only email discipline; standings visibility OK |
| SC-007 | Expand idempotency packs beyond daily submission |
| SC-031 | Confirm 118 v1.5 paste if PROD lagging; season inputs |
| SC-035 | Season dryRun/sendMode/includeSchmidt settings; monitor Sundays |
| SC-040 | Season-scale double-send watch |
| SC-049 | **Enable 035 only after approve**; not Complete while OFF |
| SC-069 | Email-path + standings spot-check |
| SC-070 | Additional daily XP reruns |
| SC-078 | Level-up past Rookie controlled test |
| SC-102–103,106,108,113 | Content/hygiene follow-ups |
| SC-111 | Optional view recreate; **deploy plaque follow-up separately** |

---

## 7. Installed-but-not-retested inventory

**Fact (master honesty rule):** After empty-base reset, prior 2025–26 live passes do not count. Treat these as needing Schmidt re-proof:

### Highest priority (P0 Installed)

SC-009, SC-010, SC-011, SC-016, SC-017, SC-022, SC-023, SC-027, SC-036, SC-045, SC-059, SC-071, SC-072, SC-073, SC-074, SC-076, SC-079, SC-080, SC-084, SC-086, SC-087, SC-090, SC-091, SC-094, SC-096, SC-099.

### Also Installed (P1–P2)

SC-002 (partial), SC-012, SC-015, SC-024–026, SC-028 (v1.3), SC-029–030, SC-037, SC-075, SC-077, SC-083, SC-085, SC-089, SC-092–093, SC-097–098, SC-101, SC-104–105, SC-107, SC-109–110.

### Special cases

| Automation / feature | Master claim | Retest note |
|----------------------|--------------|-------------|
| **035** Weekly Threshold | Live Tested; **OFF** | Re-enable test when Mike authorizes ON |
| **054 v5.6** streak | Installed | Supervised 3-day not done |
| **066 v3.3** milestones | Installed | Natural run / OMNI not done |
| **057** Perfect Week | Installed **v1.3** | Paste v1.4 then live prove |
| **020 v3.0.0** | Canonical in PROD claim | Duplicate HC live attempt still open |
| **072/074/118/119** weekly chain | LT/Complete for empty-week path | Non-weekly emails + first live Sunday monitor |
| **115** Testing Scenarios | Live Tested | Expand branches |
| Video Lambda path | Historically E2E | Re-test writeback on Schmidt asset |

---

## 8. Built-but-not-installed inventory

| Artifact | SC | Repo exists? | PROD install claim |
|----------|-----|--------------|--------------------|
| 067 Option B script + packet | SC-013/014 | Yes v2.0 | **Not confirmed pasted** |
| 057 v1.4 | SC-021/028/077/091 | Yes 1.4 | PROD **v1.3** |
| Season Launch Control + week packages | SC-032/065 | Yes | Not live-installed |
| SCN-021–043 fixtures | SC-002 | Yes (43/43 JSON) | Pending install |
| Expected-vs-Actual CLI | SC-006 | Yes | Optional writeback not wired |
| Enrollment validators | SC-060–064 | Yes offline | Live Fillout not proven |
| Active? hardening package | SC-068 | Partial | Guards not fully pasted |
| 117f approval email permanence | SC-088 | Built | Webhook often blank |
| 070a homework route | SC-095 | Yes v4.4 | **Intentionally OFF** |
| RCC MVP views/CLI | SC-147 | Yes | Views **not** installed |
| SC-148 mobile a11y | SC-148 | Yes | Awaiting Production confirm |
| SC-149 Fairfield links | SC-149 | Yes | Awaiting env confirm |
| SC-118 smoke package | SC-118 | Yes | Suite Built; ran vs PROD |
| SC-111 plaque follow-up | SC-111* | Yes local | Not deployed |
| Ownership attestation completion | SC-046/058 | Docs yes | Mike UI incomplete |
| Learning Activities schema | SC-018/019 | Docs/fixtures | Schema not created |

\*Plaque is a follow-up under SC-111, not a separate ID.

---

## 9. Planned work inventory

See §6.3. Launch-critical Planned items: **SC-003, SC-005, SC-047, SC-048, SC-135**. Presentation cluster (SC-043/054/117) is important for parent-facing quality but not required for a Schmidt-only controlled season dry-run.

---

## 10. External-system verification inventory

| System | Verified (per docs) | Still open | Cite |
|--------|---------------------|------------|------|
| **Airtable PROD** | Schmidt athlete/enrollment; some WAS/XP; 115; weekly email empty-week E2E; 035 v1.2 proof | Full attestation; most athlete paths; views | master; overnight baseline; 035 proof |
| **Make — Bulk Email May 18** | Live writeback PASS (weekly) | Failure inject; first live Sunday watch | WAS architecture |
| **Make — 117f Zoom approval** | Controlled tests historically | Permanent webhook + ON | SC-088; C-025-117f docs |
| **Make — homework Module 2** | Checklist open | 070a router | SC-101; issues #8 |
| **Fillout** | Form OFF since C-008 | Season UI defaults; reopen after SC-135 | SC-146; FILLOUT-CERTIFICATION |
| **Lambda / S3 video** | Historical PROD E2E | Schmidt re-proof | SC-094 |
| **Lambda / S3 homework 070a** | DEV package | PROD OFF until SC-095 | AUTOMATION_070A_LAUNCH_DECISION |
| **Gmail** | Weekly Live send historically | Non-weekly templates | SC-045 |
| **Vercel `/shoot`** | Smoke 2026-07-25 + 2026-08-04 HTTP/Playwright | Confirm Fairfield env; Game Manual PDF URL; plaque deploy | SC-149/109/111 |
| **Webhooks in git** | Never | Secrets only in external systems | operating rules |

**Open GitHub issues (Fact):** #57 SC-112, #56 SC-115, #1/#8/#9/#11/#17 overnight 070a blockers (stale). **Open PRs:** none at audit time. Recent merges: #58 SC-111, #55 integration, #52–#54, #50 035 v1.2.

---

## 11. Manual Mike actions

### Airtable UI / OMNI (cannot be done by API alone)

1. Create remaining **Testing** views — `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md` (SC-003).
2. Paste complete automation ON/OFF/version list → close SC-058.
3. Confirm **112 OFF**; **117 XOR 117c**; deleted set (043/032/033/063/111 claims).
4. Paste **067** Option B from install packet.
5. Paste **057 v1.4** from deploy checklist.
6. Optionally paste **118 v1.5** if PROD &lt; v1.5; set season inputs (`dryRun=false`, Live, `includeSchmidt=false`).
7. After approve: enable **035** (currently OFF).
8. Authorize schema when ready: Learning Activities (SC-018), Launch Status (SC-032).
9. RCC: create Weekly Email Health + P0 views after CLI export review (SC-147).
10. Archive mojibake Grade Bands after dependency check (SC-023).
11. Content hygiene: unpublish stale homework Week 10; achievements Visible?; Zoom cover URLs; Schmidt Grade/School Year (EXT-QA items).

### Pastes / enables

| Action | Automation | Gate |
|--------|------------|------|
| Paste | 067 v2.0 Option B | SC-013/014 |
| Paste | 057 v1.4 | SC-021/028/077 |
| Paste (if needed) | 118 v1.5 | SC-031/035 |
| Enable when approved | 035 v1.2 | SC-049 |
| Keep OFF until decided | 070a, 112 | SC-095, SC-059 |
| Keep ON | 118/119 schedules | SC-031 — **do not turn OFF** |

### Vercel / env

- Confirm `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` → Fairfield Basketball Club (SC-149).
- Set `NEXT_PUBLIC_GAME_MANUAL_URL` if PDF ready (SC-109).
- Deploy/review plaque follow-up when approved (SC-111).
- Optional: add Airtable PAT to agent env for Schmidt packages (ACCESS-BLOCKER).

### Make / Fillout

- Confirm Bulk Email scenario ON; populate 117f webhook when go-live.
- Fillout season checklist only when approaching SC-146 reopen.

### Explicit non-actions

- Do **not** disable 118/119 from stale docs.
- Do **not** install Stage 16 117a/117b.
- Do **not** treat Softr as a launch gate.
- Do **not** force 074 sendMode=Test for season.
- Do **not** enable 070a without SC-095 authorization.

---

## 12. Stale or contradictory documentation

Highest-severity conflicts with master §1 / SC-031 / SC-114 / SC-137 / SC-149:

| Severity | Stale claim | Where (examples) | Master truth |
|----------|-------------|------------------|--------------|
| **High** | Keep 118/119 OFF | `docs/next-wave/automation-ownership/MIKE-ACTIONS.md`; `docs/overnight/MIKE-ACTIONS-TOMORROW.md`; final-reconciliation docs; PR34 reconciliation | Schedules **ON** |
| **High** | DEV-first forever / never paste without DEV | `docs/ENGINEERING_CONSTITUTION.md`; `docs/v2/04-ai-development-standards.md` | PROD-direct approved |
| **High** | Never install 115 in PROD | `AUTOMATION_VERSION_INVENTORY.md`; C-025 release packets | 115 Live Tested (SC-001) |
| **High** | Stage 16 / 117a–b current | KNOWN_ISSUES K-M1; V2 Zoom DEV install docs | Stage 17 **117**; SC-136 Superseded |
| **High** | Softr as launch dependency | SOFTR-CUTOVER-READINESS body | SC-114 Superseded |
| **High** | Landing = hoopchallenges.com | launch-certification START-HERE/VERCEL; recovery MIKE-NEXT-ACTIONS; truth audit §4 step 1 | Fairfield (SC-149) |
| **Med** | Prefer quiz PDF | overnight MIKE-ACTIONS-TOMORROW SC-014 | Option B decided |
| **Med** | PROJECT_STATE “115 not installed” in places | `docs/PROJECT_STATE.md` C-025 table | 115 installed |
| **Med** | Brief/backlog as live ops truth | `CHATGPT-MASTER-PLAN-BRIEF.md` (~2026-07-05); `v2-change-backlog.md` | Master wins |

**Proposed (SC-139):** banner or redirect note on the High list; do not rewrite history blindly — mark Historical Reference Only.

---

## 13. Missing requests found outside the completion master

| # | Candidate | Source | Verdict |
|---|-----------|--------|---------|
| 1 | Most backlog/overnight asks | v2-change-backlog, overnight packs | **Already covered** by SC-001…149 (master §8 maps older IDs) |
| 2 | Optional CI for `test:smoke` | SC-118 remaining | **Covered** as SC-118 follow-up — no new SC |
| 3 | CloudFront vs direct S3 URL | C-013 wave7 | **Ambiguous** under SC-094–101 — Mike decide if dedicated SC needed |
| 4 | Submission formula XP vs SHOOTING_BASE | overnight MIKE-ACTIONS #7 | **Ambiguous** — fold into SC-021/022 decision; **Proposed** clarify in master Decision table |
| 5 | Brand Standards still lists Hoop Challenges | master §9F; BRAND_STANDARDS.md | **Missing as SC** — cross-repo brand sync |
| 6 | Secret scanner / gitleaks CI | security audits | **Covered** loosely SC-145 |
| 7 | Athlete profile plaque polish | plaque evidence 2026-08-04 | **Covered** under SC-111 follow-up |

**Proposed new SC IDs (only if Mike wants them tracked separately):**

| Proposed ID | Title | Why |
|-------------|-------|-----|
| **SC-150** *(proposed)* | Cross-repo Brand Standards sync (Fairfield vs Hoop Challenges) | Explicitly called out unresolved; no SC today |
| **SC-151** *(proposed)* | Resolve competing Submission formula XP vs SHOOTING_BASE economics | Overnight ask not clearly owned |

Do **not** create duplicates for Testing views, 057 paste, 070a, auth, noindex, EMC, Program Instance, etc.

---

## 14. Recommended first package

### Package P01 — Foundation attestation + Testing views

| Field | Content |
|-------|---------|
| **Included SC** | SC-003, SC-046 (attest), SC-058, SC-059 |
| **Exact goal** | Mike can see Schmidt pipeline rows; dual-writer risks attested; automation inventory matches UI |
| **Why first** | Every later live test depends on trustworthy writers + visibility |
| **Prerequisites** | None beyond Airtable UI access |
| **Repo actions** | None required (docs already exist) |
| **Airtable PROD** | Create Testing views per `TESTING-VIEWS-MIKE-ACTIONS.md`; paste ON/OFF/version list into attestation packet; confirm 112 OFF; 117 XOR 117c |
| **External** | None |
| **Schmidt test** | Open each Testing view; confirm expected Schmidt rows visible (Submissions/XP/WAS after prior 115 runs) |
| **Expected outcomes** | Views exist; attestation packet filled; SC-058/059 move toward Complete only after attest |
| **Regression** | Do not hide Schmidt; do not enable 112; do not dual-ON 117+117c |
| **Proof** | Screenshots or pasted UI list in `docs/testing/evidence/` + completion-master update |
| **Risk** | Medium (wrong attestation → wrong deletes) |
| **Mike-only** | View creation; UI list paste; XOR confirmation |
| **Order** | **First** |

---

## 15. Proposed next 10 work packages (exact order)

| # | Package | SC focus | Next concrete action |
|---|---------|----------|----------------------|
| **1** | P01 Foundation attestation + Testing views | SC-003,046,058,059 | Mike creates views + pastes UI automation list |
| **2** | P02 Critical pastes (067 → 057 v1.4 → 035 enable decision) | SC-013/014,021/028/077,049 | Paste 067; paste 057; decide 035 ON |
| **3** | P03 Homework E2E Schmidt | SC-009–017,071 | Photo/written/quiz Option B → review → XP → email |
| **4** | P04 Video + asset writeback | SC-011,072,094–099 | Schmidt video upload → 070c verify → VIDEO XP |
| **5** | P05 Zoom exclusivity | SC-073/074,084–091 | Seed meeting; live attend; recording conflict=1 |
| **6** | P06 Streak / milestone / Perfect Week / gates | SC-027/029,075–080 | Supervised 3-day; milestone cross; PW after 057; gate block/clear |
| **7** | P07 Weekly email residuals + non-weekly emails | SC-031/035/036/045,041 | Confirm season inputs; homework/welcome emails; optional fail inject |
| **8** | P08 Season Launch + Weeks import | SC-032,065,068 | generate-week-package → manual import → Launch Status authorize |
| **9** | P09 Full dry-run matrix | SC-005,007,008,135 | Execute matrix; failure paths; declare dry-run PASS/FAIL |
| **10** | P10 Web Production confirm + Fairfield/PDF | SC-148,149,118,109 | Vercel env + smoke; Game Manual URL; then content hygiene |

After #10: P11 config cleanup → P13 070a (if Yes) → P14 117f → P15 RCC → reopen intake (SC-146) only after P09 PASS.

---

## 16. Final launch-readiness definition

A **usable Shooting Challenge season** may be declared only when **all** of the following are true:

### A. One real athlete can safely enroll and use the full program

1. Enrollment/Fillout validation trustworthy (SC-060–063 Live Tested) **or** Mike manually creates the athlete with verified email hygiene.
2. Weeks + season config correct (SC-032/065 Live Tested).
3. Daily submission → one XP Event (SC-070 already LT; still green on fresh run).
4. Homework path: intake → assets (or Option B quiz) → one HC → satisfactory → XP → parent email (SC-009–017,071 LT).
5. Video path writeback + XP (SC-072,094–099 LT) **or** explicitly out-of-season for v1.
6. Zoom live + recording exclusivity (SC-084–087 LT).
7. Streak / milestone / Perfect Week / gates proven or explicitly deferred with Mike sign-off (SC-075–080).
8. Weekly WAS build/send works with schedules ON; `includeSchmidt=false` for real season traffic (SC-035–040).
9. Dual-writer conflicts closed or mitigated (SC-046/047/059): **112 OFF**, **117 XOR 117c**, 020/067 identity rule understood.
10. Public `/shoot` reads live config without leaking tokens (SC-102 LT).

### B. Multiple athletes can use it

All of A, plus:

11. Active? / PPE processing safe (SC-068).
12. WAS uniqueness at multi-enrollment scale (SC-035/040 watch).
13. Fillout intake reopened intentionally (SC-146) after SC-135 dry-run PASS.
14. Email routes never blast test families; Make scenarios confirmed.
15. RCC or equivalent ops visibility recommended (SC-147) for weekly-email health.

### C. Evidence bar

- Completion master statuses updated with record IDs / paste dates / evidence paths.
- No High-severity stale doc still used as an operator runbook without banners.
- Code in GitHub alone never counts as Complete.

---

## 17. Answers to required audit questions

1. **Before one real athlete uses full program:** P01–P07 complete (attestation, pastes, HW/video/Zoom/progression/email residuals) + season Weeks (P08) at least for the test window.
2. **Before multiple athletes:** P08–P09 + SC-068 + SC-146 reopen after dry-run PASS; multi-enrollment WAS watch.
3. **Installed automations needing Schmidt re-proof after wipe:** Essentially all Installed athlete-path items in §7 (homework, video, Zoom, streak, milestone, PW, gates, assets, non-weekly emails). Weekly empty-week email already re-proven 2026-07-24; 035 proven but OFF.
4. **Repo-built not installed:** 067 (unconfirmed), 057 v1.4, SCN-021–043, Season Launch live fields/Weeks import, RCC views, 070a ON, SC-148/149 Production confirm, plaque follow-up, LA schema.
5. **Installed but OFF (documented):** **035** (SC-049); **070a** (intentional); **112** must stay OFF. (**Inference:** other OFF automations may exist — UI attest required.)
6. **Season schedules intentionally ON:** **118** (Sun 5:00 AM Denver) and **119** (Sun 10:00 AM Denver).
7. **Schema still needed:** Testing views (not fields); optional Launch Status / LA tables (Mike authorize); Presentation fields (SC-054); formula review (SC-048); Softr-named publish flag rename (SC-144); Grade Band archive.
8. **Testing views Mike must create:** Full list in `TESTING-VIEWS-MIKE-ACTIONS.md` — Testing Scenarios, Submissions, XP Events, WAS, Submission Assets, Homework Completions, Video Feedback, Achievements, Enrollments, Weeks, email queues; only Athlete Achievement Unlocks currently claimed to have a Testing view.
9. **Scenarios repo-only:** SCN-021–043 (001–020 installed).
10. **External unverified:** Make 117f webhook; Make failure inject; Fillout season UI; 070a Module 2; Vercel Fairfield/PDF env; Lambda Schmidt re-proof.
11. **XP duplicate / competing writer risks:** 020 vs 067 HC identity; 013 vs 112 Video Feedback; 117 vs 117c Zoom XP; hybrid WAS creators 031/101/118; Threshold dual-ON risk if old writer re-enabled; formula XP vs SHOOTING_BASE economics.
12. **Not re-tested with Schmidt:** HW/video/Zoom/streak/milestone/PW/gates/homework email/video email/welcome; level-up past Rookie; achievements unlocks; many catalog pages content.
13. **Unsupported/stale statuses:** Dashboard Built/Planned off-by-one; SC-021 informal bucket; SC-028 “Installed” easy to misread as v1.4; SC-049 LT while OFF; SC-148/149 may need Production verify; overnight decision table still says Prefer PDF.
14. **Obsolete instruction spreaders:** listed in §12 (OFF schedules, DEV-first, never 115, Stage 16, Softr, hoopchallenges).
15. **Mike decisions before continue:** SC-044/066/081/112/115; 070a timing; 035 enable; Video XP 1vs25; 117 XOR attest; LA/Launch schema authorize; Fairfield env confirm.
16. **Shortest safe path:** Execute packages **1→10** in §15; do not reopen Fillout until P09 PASS; ignore stale OFF/DEV-first docs.

---

## Appendix A — Excluded Complete / Superseded / Deferred / Not Needed

### Complete (12) — no active work

SC-038, SC-039, SC-055, SC-119, SC-120, SC-121, SC-122, SC-123, SC-124, SC-130, SC-140, SC-141.

### Superseded (4)

SC-114 (Softr), SC-125 (archive/clone), SC-136 (Stage 16 Zoom), SC-137 (never install 115).

### Not Needed (2)

SC-126 (dual-track), SC-142 (monitoring-only close-out leftovers).

### Deferred (10) — reconsider only if Mike prioritizes

| ID | Topic | Reconsider? |
|----|-------|-------------|
| SC-042 | Email Message Center | After C-011 stable — capacity risk |
| SC-067 | Program Instance | After first live season — Season Launch is interim |
| SC-100 | Drive retirement | After S3 HW+video stable |
| SC-127–129 | Awards/lookup cleanup | Low |
| SC-131–132 | Media kit platform / Facebook | Optional |
| SC-143 | Multi-challenge platform | Out of repo |
| SC-146 | Re-open Fillout intake | **Yes — after SC-135**; currently correctly Deferred |

### Intentionally excluded from this audit’s active redesign scope

- Completed SC-111 core public athlete profiles (plaque follow-up remains Built).
- General website visual redesign / landing marketing (beyond SC-149 Fairfield links).
- Team Shot Tracker / JR Ref / obsolete Softr activation work.

---

## Appendix B — Package detail templates (P02–P10 abbreviated)

### P02 — Critical pastes

- **SC:** SC-013, SC-014, SC-021, SC-028, SC-077, SC-049  
- **Repo:** use `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md`; `docs/deploy-checklists/057-perfect-week-denver-v1.4.md`; `docs/deploy-checklists/035-weekly-threshold-xp-v1.2.md`  
- **PROD:** paste scripts; leave 035 OFF until enable approved  
- **Test:** Option B HC 0 assets → 1 XP; Denver boundary PW; 035 already has proof — enable smoke only  
- **Risk:** Medium–High (XP writers)  
- **Proof:** record IDs + evidence markdown under `docs/testing/evidence/`

### P03 — Homework E2E

- **SC:** SC-009–017, SC-071  
- **Depends:** P01–P02 (067 for quiz)  
- **Test:** photo (may need 070a decision), written, multi-file, duplicate HC attempt, coach satisfactory → XP → 071 email  
- **Risk:** Medium  
- **Watch:** 020 vs 067 dual create

### P05 — Zoom

- **SC:** SC-073/074, SC-084–091  
- **Depends:** attest 117 XOR 117c  
- **Test:** live attend XP; recording credit; Conflict=1 soft-void; gate + PW integration after 057 v1.4  
- **Risk:** High (double XP)

### P08 — Season launch

- **SC:** SC-032, SC-065, SC-068  
- **Repo:** `tools/challenge-year/cli.js generate-week-package`  
- **PROD:** manual Weeks import; Launch Status fields if authorized  
- **Risk:** Medium (date mapping)

### P09 — Dry-run gate

- **SC:** SC-005, SC-007, SC-008, SC-135  
- **Exit:** matrix mostly green on Schmidt; failure paths exercised or explicitly waived  
- **Then:** SC-146 reopen decision

---

## Appendix C — Areas not fully inspectable in this audit

| Area | Limitation |
|------|------------|
| Live Airtable UI | No API token in this environment — ON/OFF/version not freshly read |
| Make.com scenario toggles | No live Make access |
| Vercel dashboard env values | Not read; public smoke proves site up, not env contents |
| Fillout builder UI | Docs only |
| Lambda AWS console | Docs/historical E2E only |
| Every line of `docs/v2-change-backlog.md` / ChatGPT brief | Sampled via master §8 mapping + explore pass; treat master as SoT |
| Untracked `.cursor` / Impeccable skill tree | Out of SC application scope — ignored |

---

## Appendix D — Evidence index (primary)

| Topic | Path |
|-------|------|
| Controlling master | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` |
| Prior truth audit | `docs/audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md` |
| 035 live proof | `docs/testing/evidence/2026-08-03-035-v1.2-schmidt-live-proof.md` |
| Testing views | `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md` |
| Field writers | `docs/overnight/testing-integrity/FIELD-WRITER-AUDIT.md` |
| 067 install | `docs/next-wave/homework-pipeline/067-OPTION-B-PROD-INSTALL.md` |
| 057 paste | `docs/deploy-checklists/057-perfect-week-denver-v1.4.md` |
| WAS architecture | `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md` |
| Access blocker | `docs/prod-completion/2026-07-25/ACCESS-BLOCKER.md` |
| Scenario install | `docs/testing/scenarios/PROD-INSTALL-EVIDENCE-2026-07-25.md` |
| Production smoke | `docs/testing/evidence/PRODUCTION-SMOKE-2026-08-04.md` |
| SC-111 | `docs/testing/evidence/athlete-profiles-2026-08-04/` |
| Plaque | `docs/testing/evidence/athlete-profiles-2026-08-04-plaque/` |

---

*End of Remaining Work Audit — 2026-08-04. Do not update completion-master statuses from this document until Mike accepts a package and evidence is filed.*
