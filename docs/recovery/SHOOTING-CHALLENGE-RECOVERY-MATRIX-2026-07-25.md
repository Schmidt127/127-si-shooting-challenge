# Shooting Challenge — Recovery Matrix (2026-07-25)

Source audit: [SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md](./SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md)  
Tomorrow handoff: [SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md](./SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md)

Status vocabulary: Planned · Built in Repository · Committed · Pushed · PR open · Ready for PROD Paste · Installed in PROD · Live Tested · Complete · Blocked

| Package | Repo State | Git State | PR | PROD Installed | Live Tested | Blocker | Overlap | Next Action |
|---------|------------|-----------|----|----------------|-------------|---------|---------|-------------|
| COM-MAKE-001 Email Delivery Queue Processor | Scenario configured in Make; success/retry/exhausted routes mapped | External Make scenario; recovery evidence documented on #47 | #47 evidence only | **Yes** | **Success path PASS**: Schmidt email sent, Delivery Sent writeback, provider metadata, Processed Integration Event | Retryable + exhausted live proof still open; scheduling remains OFF | Related to SC-008 and SC-041, but not a replacement for SC-041 SOP proof | Pause; later run a named controlled failure-path package |
| Automation 035 v1.1 | Built (PR tip only; absent on master) | Committed + Pushed @ `7aff310` | #43 draft | **No** | **No** | Mike UI paste OFF-first + Schmidt Tests 1–5 | None unique | After #45 path: paste from PR #43 checklist |
| Automation 057 v1.4 | Built identical on #43+#44; master still v1.3 | Committed + Pushed | #43 **authoritative**; #44 duplicate | **057 Live** (version unverified; treat as ≤v1.3 risk) | Perfect Week re-proof **open** | Mike paste v1.4 + regression | **Identical** overlap #43/#44 | Paste **only from PR #43**; ignore #44 057 delta |
| Automation 067 Option B | Built; PR #44 adds install packet + header sync | Committed + Pushed @ `7b5fa48` | #44 draft | **Not in Automations inventory** | **No** | Confirm/create 067 in UI; Schmidt Option B | SCN-027 ID clash with #46 | After 057 decision: install packet then live proof |
| SC-041 weekly-email retry | Built on #46; master still Planned | Committed + Pushed @ `1c2dcc7` | #46 draft | N/A (SOP/contracts; 074 already Live) | **No** failure→recovery | Mike authorization for deliberate failure | SCN-027 ID clash with #44; related to COM-MAKE-001 but distinct | Keep draft; no failure test yet |
| PR #45 public web fixes | Built | Committed + Pushed @ `18cd2df` | #45 draft; CI pass | Preview yes / **Production no** | Browser QA on prod **partial**; Playwright 44/44 **unproven this audit** | Production promote + env | Completion-master status thrash vs master | **NEXT PACKAGE** — env + deploy + Playwright |
| Vercel landing URL | Local `.env.local` correct; repo typo guard on #45 | — | Tied to #45 | Production HTML still has **`hooopchallenges.com`** | Live defect confirmed | Mike Vercel Production env + redeploy | — | Set `NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com` then redeploy |
| SC-102 public smoke | Installed (master); smoke docs on #44/#45 | Pushed on PR branches | #44/#45 | Site Live | Partial smoke; **not Complete** | Catalog quality + Playwright | Divergent master vs PR status text | Re-evaluate after #45 production |
| SC-109 Game Manual | Built; config sections live | — | #45 notes partial | Partial (XP/Levels; PDF env empty) | Partial | EXT-QA-001 PDF URL | — | Set Game Manual URL after #45 |
| SC-115 noindex | Decision Needed | — | — | noindex still on | — | Mike written approval | — | Do not flip |
| Reliability Command Center | Built (PR #40 on master) | On master | — | Views **not** installed | Fixture CLI archives on #44 only | Mike MVP view install + PROD export | — | OMNI views after export |
| Schmidt A–F protocols | Documented on #44 | Pushed | #44 | — | **Not executed** (cloud PAT blocker; desktop can read now) | Mike/agent live runs | Overlaps #43 live-proof pack | Use #43 pack for 035/057; #44 for quiz/milestone/streak |
| SC-139 document refresh | Started on #44 | Pushed | #44 | — | — | Merge hygiene | Conflicts with other PR completion-master edits | Defer until packages land one-at-a-time |

## Authoritative choices

| Topic | Choice |
|-------|--------|
| COM-MAKE-001 current state | **Installed; success path live-proven; scheduling OFF; failure paths open** |
| 057 v1.4 source | **PR #43** |
| 035 v1.1 source | **PR #43 only** |
| 067 Option B packet | **PR #44** |
| SC-041 SOP | **PR #46** |
| Web browser fixes | **PR #45** |
| Recovery / tomorrow checkpoint | **PR #47** |
| SCN-027 | **Conflict** — rename one before merge (quiz vs email retry) |