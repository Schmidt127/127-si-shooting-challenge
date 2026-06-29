# XP & level motivation analysis — 2025–26 season (deferred)

**Status:** Draft for post–close-out review. **Do not change XP, levels, gates, or streak rules until after the 2025–26 challenge ends** (target review start: **2026-07-01**).

**Watchlist:** [close-out-considerations.md](./close-out-considerations.md) → **C-014**

**Data snapshot:** 91 active enrollments, pulled **2026-06-29** (pre–final close-out audits).

---

## First-year context (read before interpreting numbers)

This was the **first season with levels and XP**. Several factors skew the data and should **not** be treated as steady-state behavior for future seasons:

1. **Last-year hangover** — Many families experienced Year 1 as “pure shots matter.” The leaderboard and parent mental model were shot-count driven; XP/levels were new.
2. **Mid-stream rollout** — Gates, levels, and the level-based game were **not fully configured in the first two weeks**. Kids started under last year’s expectations, then had to adapt mid-season.
3. **Split identity** — XP totals (shooting-heavy) and level titles (gate-heavy from Deadeye up) diverged for a large cohort; some of that is design, some is rollout timing.

**Implication for July review:** Compare this year’s stats to **2026–27** after a clean Week 1 launch before making structural changes. Use this doc as hypotheses to test, not final verdicts.

---

## What the system rewards (mechanics)

| Layer | Mechanism | 2025–26 XP share |
|-------|-----------|------------------|
| **Daily shooting** | Flat **20 XP per counted submission day** (not per shot) | **~64%** (33,400 XP) |
| **Breadth** | Homework 35, Video 25, Zoom 60 (+ bonuses) | ~12% HW, ~6% video, ~4% zoom |
| **Consistency** | Streaks + shot milestones + perfect week | ~11% streaks, ~5% milestones |

**Shooting-only level math:** 200 XP per level step → **~10 shooting days per level** if that is all they do.

**Homework vs shooting:** One satisfactory homework (35 XP) ≈ **1.75 shooting days** — competitive on paper, but levels did not require homework until **Deadeye (1,200 XP)**.

---

## Season distribution (91 active enrollments)

| Metric | Min | Median | Mean | Max |
|--------|-----|--------|------|-----|
| Lifetime XP | 0 | 425 | 572 | 3,078 |
| Shots counted | 0 | 1,758 | 3,138 | 16,650 |
| Homework completions | 0 | **0** | 1.5 | 19 |
| Submission days | — | 14 | 19 | 64 |

**Participation:**

| Activity | Athletes (≥1) |
|----------|----------------|
| Shooting (≥5 submission days) | 58 |
| Homework | 35 |
| Video | 44 |
| Zoom | 21 |
| Homework ≥6 | 9 (~10%) |
| **Zero homework all season** | **56 (61.5%)** |

**Level distribution:**

| Level | Count |
|-------|-------|
| Beginner | 34 |
| Rookie / Developing | 24 |
| Consistent / Dangerous / Hot Hand | 27 |
| Deadeye+ | 6 |

**Gate blocking:** 16 athletes (**17.6%**) at `Level Status = Gate Blocked`. Of athletes with **1,000+ XP**, **16 of 21** were blocked — homework was the dominant missing requirement.

**Level ladder:** 0 → 2,200 cumulative XP in **200 XP steps** (12 levels). Gates **open through Hot Hand**; from **Deadeye** onward require submissions + homework + videos (+ zoom/streak at higher tiers). See Level Gate Rules table in Airtable (2025–2026 rule set).

---

## Motivation model (subjective framework)

Four levers to optimize when tuning next year:

| Lever | Question |
|-------|----------|
| **Frequency of wins** | Do kids level up often enough in weeks 1–3? |
| **Agency** | Does extra effort (more shots, HW, video) feel rewarded? |
| **Fairness** | Do XP rank and level title tell a coherent story? |
| **Prestige** | Is the top rare but aspirational? |

### What likely worked

- Early shooting progression (levels 1–6) without friction.
- Streak XP pool meaningful (~5,875 season total).
- Rare top levels (1 G.O.A.T., 1 Pro, 1 Sharpshooter).

### What strained motivation (hypotheses)

- **Participation cliff at ~1,000 XP** — XP says “elite”; gates say “complete homework/video first.”
- **Homework invisible in early levels** — 62% never completed any; may not have understood it mattered for levels.
- **No within-day marginal shooting reward** — extra shots same day barely add XP; weekly thresholds barely fired (**270 XP** season-wide).
- **Long tail at zero** — 26 athletes at **0 XP**; 34 still Beginner.

---

## Streak economics (must evaluate — C-014)

**How streaks work (053 + 054):**

- Valid shooting days (counted submission, shots > 0) form **streak blocks**; gaps break a block.
- Each **active Streak Length achievement** (3, 5, 7, 10, 20, 30, 40, 50, 60 days) creates a **separate Streak Occurrence** when a block reaches that threshold.
- **Lower milestones fire again on each new block** after a break (by design in 053).
- Each occurrence → one XP Event (054); Source Key prevents duplicate award for same enrollment + achievement + streak end date.

**Active streak XP amounts (XP Reward Rules):**

| Milestone | XP |
|-----------|-----|
| 3-day | 10 |
| 5-day | 15 |
| 7-day | 20 |
| 10-day | 30 |
| 20-day | 50 |
| 30-day | 60 |
| 40-day | 75 |
| 50-day | 90 |
| 60-day | 105 |

### Cumulative XP within one uninterrupted block

| Block length | Milestones earned | Total streak XP |
|--------------|-------------------|-----------------|
| 7 days | 3 + 5 + 7 | **45** |
| 10 days | 3 + 5 + 7 + 10 | **75** |
| 20 days | 3 + 5 + 7 + 10 + 20 | **125** |
| 30 days | … + 30 | **185** |

### The “break vs hold” question

**Example A — one 20-day uninterrupted streak:** **125 XP** (20 shooting days).

**Example B — three separate 7-day streaks** (break, restart, break, restart):  
3 × (10+15+20) = **135 XP** (21 shooting days).

→ **Three 7-day streaks beat one 20-day streak** by 10 XP with only one extra shooting day — and calendar time can be much longer if breaks are long.

**Example C — five 7-day streaks** (35 shooting days): 5 × 45 = **225 XP**.  
**Example D — 35 consecutive days:** only through 30-day milestone = **185 XP**.

→ **Breaking and restarting can dominate long continuous streaks** in the current ladder, because 3/5/7-day awards **repeat** on every new block but there is **no extra reward for continuity** beyond the next higher milestone.

### Design intent vs incentive

| Goal | Current behavior |
|------|------------------|
| **Habit / daily consistency** | Under-rewarded vs stop-start pattern |
| **Reach 30/60-day prestige** | Still best path for top milestones |
| **Anti-gaming** | No guard against “farm 7-day cycles” |

### Streak review checklist (July)

- [ ] Pull **Streak Occurrences** report: count of repeated 3/5/7 awards per enrollment; flag “serial restarters.”
- [ ] Model alternative rules (spreadsheet or extension script):
  - **Continuity bonus** — e.g. +X XP when block length exceeds previous block.
  - **One-time lower milestones** — 3/5/7 only once per season per athlete.
  - **Escalating repeat** — second 7-day streak in a season pays less than first.
  - **Merge milestones** — award only the **highest** milestone per block (lose staircase within block).
  - **Calendar streak** — must be consecutive calendar days (already true); add **minimum shots per day** if not already enforced.
- [ ] Compare **season XP from streaks** under current rules vs simulated alternatives using 2025–26 submission dates.
- [ ] Align streak messaging in weekly email with intended behavior (don’t praise “streak reset” if continuity is the goal).

---

## Dual player model — shooting-only vs all-encompassing (brainstorm)

**Design tension (2026-06-29):** Levels/XP are preferred over raw shot totals, but **homework, video feedback, and Zoom require much more parent organization**. Pushback is legitimate. Goal: **entice both player types** — celebrate the full-program athlete without making shooting-only kids feel cut out.

### Parent workload (honest framing)

| Path | Parent/athlete effort (rough) | What it builds |
|------|------------------------------|----------------|
| **Shooting-only** | ~5 min/day — log shots, submit form | Habit, volume, streaks |
| **All-encompassing** | + HW uploads/reviews, video recording, scheduled Zoom | Reflection, coaching relationship, community |

Comms should **name both paths up front** in Week 0 — not “you’re failing if you skip HW,” but “here are two ways to win.”

### What went wrong in 2025–26 (for dual-track thinking)

Today the system **merges then splits**:

1. **One XP pool** — shooting dominates (~64%); HW/video/zoom add on top.
2. **One level title** — until Hot Hand, shooting alone works; **after 1,000 XP, gates block** on HW/video/zoom.

Shooting-only kids climb for weeks, then hit a wall that feels like punishment. Parents who never signed up for “homework program” hear “you’re Hot Hand on XP but stuck on level.”

### Core principle: **two progress stories, not one gate**

Do not ask “how do we force everyone through homework?” Ask “how do we make **both paths feel complete**?”

### Option A — **Parallel ranks** (strongest fit for parent pushback)

| Track | Driven by | Levels / title | Ceiling |
|-------|-----------|----------------|---------|
| **Shooter Level** | Shooting XP + streaks + shot milestones | Beginner → Hot Hand (or new “Max Shooter” at level 8–10) | Full ladder **without** HW/video/zoom gates |
| **Program Honors** | HW + video + zoom checklist | Badges: Bronze / Silver / Gold Program, or “Complete Player” tiers | Unlocks **prestige titles** only on this track (Legend, G.O.A.T.) |

- Leaderboard: default **Total XP**; filter **Shooter XP** for apples-to-apples with last year.
- Weekly email: two lines — “Shooter Level: Hot Hand” + “Program: 3/10 homework (Silver path).”
- **No gate blocking** on shooter level; breadth unlocks **extra** recognition, not permission to keep leveling.

**Pros:** Clear parent choice; shooting-only kids never “fail.” **Cons:** Two systems to explain and build (042 split or second progression field).

### Option B — **Single ladder, soft ceiling for shooters**

Keep 12 levels, but **remove hard gates** from level assignment. Instead:

- Levels 1–12 = **XP only** (shooting path can reach top numeric level).
- **Gated “prestige suffix”** or badge: “Deadeye ★” vs “Deadeye” when program checklist met.
- G.O.A.T. = XP threshold **plus** program checklist (explicit elite tier).

**Pros:** Minimal schema change; one level number kids understand. **Cons:** “Level 12 without star” must feel honored, not second-class.

### Option C — **XP multiplier lane (entice, don’t require)**

Shooting-only: 1× XP. Each program activity adds **small persistent multiplier** or **bonus pack** (e.g. +10% XP for week after satisfactory HW).

**Pros:** Nudges breadth without blocking. **Cons:** Math-heavy; parents may not notice; still favors organized families over time.

### Option D — **Season quests (optional parent-heavy weeks)**

Core loop = daily shooting + levels. **Optional weekly quests** (1 video, 1 HW) grant **quest XP** that does not block shooter levels but appears on a **Quest Board** leaderboard.

**Pros:** Flexible; busy weeks skipped guilt-free. **Cons:** Needs UI/comms so quests feel fun, not homework.

### Recommended hybrid for 2026–27 (strawman)

1. **Shooter Level** — XP-only through full ladder (or cap shooter title at Hot Hand / Sharpshooter; tune in July).
2. **Program Path** — separate badge track for HW / video / zoom; required only for **Legend / G.O.A.T.** display on web and end-of-season email.
3. **Week 0 parent letter** — two columns: “Minimum commitment” vs “Full experience.”
4. **Remove gate blocking from 042** for shooter level; move gate criteria to **honors eligibility** only.
5. **Streak + milestone fixes** — still apply to everyone (low parent lift).

### Messaging that reduces pushback

- “**Every counted day counts.**” (shooting path is valid)
- “**Program Path is optional enrichment** — more coach time, more community.”
- Avoid: “You’re blocked.” Use: “Unlock Program Honors” or “Ready for ★ Deadeye.”
- Younger grades: explicitly OK to stay shooting-only; older grades: invite, don’t require.

### July decisions (dual-track)

- [ ] Pick A, B, C, D, or hybrid — prototype in spreadsheet with 10 real enrollments (pure shooter, mixed, full program).
- [ ] Define **web leaderboard** columns (Total XP vs Shooter XP vs Program badge).
- [ ] Define **end-of-season email** — equal dignity for “Season Shooter: Hot Hand” vs “Complete Player: Gold.”
- [ ] Estimate **automation/schema** work (042 refactor vs new Enrollment fields).

---

## Game manual first + gates spread across the season (2026-06-29)

**User insight:** Better communication — **game manual as the first thing every family receives** — plus **gates spread from the start** (not clustered at Deadeye) would set expectations early: homework and program activities **help** level progress, they are not a surprise mid-season.

This complements (does not replace) the dual-track brainstorm: even shooting-first families deserve **predictability**; full-program families deserve **credit visible from week 1**.

### What hurt in 2025–26

| Issue | Effect |
|-------|--------|
| Rules/gates **not live weeks 1–2** | Early behavior formed on last year’s “shots only” model |
| **No single game manual** before first submission | Parents discovered HW/video/zoom matter when someone got “gate blocked” |
| **All breadth gates from Deadeye (1,000 XP) up** | Homework felt optional for ~10 weeks, then mandatory for level title |
| Weekly email focused on **this week’s activity**, not **how it feeds levels** | HW framed as extra work, not XP/level fuel |

### “Game manual first” — delivery checklist (Week 0)

**Send before Fillout opens / before first submission day.** One doc (PDF or web page at `/shoot/rules` or similar), linked in registration confirmation and first parent email.

Suggested sections:

1. **Two ways to play** — shooting path vs full program (see dual-track); both valid.
2. **How XP works** — 20 XP per counted day; HW 35; video 25; zoom 60; streaks; milestones (one table, plain language).
3. **Level ladder map** — visual: level name, XP needed, **what else unlocks this level** (submissions / HW / video / zoom / streak if any).
4. **Spread gates table** — see below; “you will need X homework by level Y.”
5. **Parent time honest guide** — minutes per week for each path.
6. **FAQ** — “My kid only shoots — is that OK?” “What if we miss a Zoom?”

**Repeat the manual link** in weekly email footer and athlete portal — not just once.

### Graduated gates (spread throughout)

**Principle:** Small, cumulative requirements **starting at low levels** so HW/video are **part of the game from day 1**, not a cliff at Hot Hand.

**2025–26:** Levels 1–6 had **zero** gate requirements; level 7 (Deadeye) jumped to 6 HW + 6 videos + 30 submissions.

**Strawman for 2026–27** (tune numbers in July; must match Level Gate Rules table):

| Level | XP (cum.) | Gate idea (illustrative) |
|-------|-----------|---------------------------|
| Rookie Shooter | 200 | 3 submission days (already likely met) |
| Developing | 400 | **1 satisfactory homework** |
| Consistent | 600 | **1 video** + 15 submission days |
| Dangerous | 800 | **2 homework** + 5-day streak |
| Hot Hand | 1,000 | **3 homework** + 2 videos |
| Deadeye+ | 1,200+ | Continue ramp (current curve, softened at bottom) |

**Rules for graduated gates:**

- **Never zero → six** in one step; each level adds **at most 1–2** new requirement types or counts.
- Show **progress in weekly email**: “Level 4 unlock: 1/2 homework done.”
- Pair with manual: parents saw Developing = 1 HW **before** season started.
- If dual-track adopted: graduated gates apply to **unified level** OR **program honors only** — pick one story and document it in the manual.

### How comms + gates interact with dual-track

| Approach | Manual says | Gates |
|----------|-------------|-------|
| **Single ladder + spread gates** | “Homework helps you level starting at Developing.” | Light HW/video from level 3–4; shooting-only families opt in knowing the map |
| **Dual-track (parallel ranks)** | “Shooter levels = XP only; Program badges = HW/video/zoom.” | Gates on program track only; shooter ladder gate-free |
| **Hybrid (recommended to prototype)** | “You can max shooter rank by shooting; **starred levels** need program checklist spread across season.” | Spread checklist items across levels as **honors**, not hard block — or soft block with clear manual |

User preference leans **full-program** — spread gates + manual **signal early that HW helps**, while dual-track still protects families who truly cannot do the parent-heavy path.

### Weekly email additions (low dev cost)

- **Level progress block** — current level, XP to next, **next gate item** (1 line).
- **Program vs shooter** — if dual-track: two lines every week.
- Link: **“Read the Game Manual”** every send.

### July tasks (comms + gates)

- [ ] Draft **2026–27 Game Manual** (content before automation changes).
- [ ] Redesign **Level Gate Rules** curve — spread vs cliff; align with manual table.
- [ ] Decide gate placement: **unified level** vs **honors-only** vs hybrid.
- [ ] Web: `/shoot` rules page mirrors manual (parents bookmark).
- [ ] Registration / Week 0 automation: manual link **required** before first submission (email or checkbox “I read the rules”).

---

## Recommended tuning directions (post–July 1 only)

**Priority 1 — Game manual + Week 0 comms**

- Manual **before** first submission; level map with **spread gates** table; honest parent time guide.
- Weekly email: level progress + next gate item + manual link.

**Priority 2 — Dual-track progression OR graduated gates (pick in July)**

- **Option 1:** Parallel shooter vs program tracks (see dual-track section).
- **Option 2:** Single ladder with **gates spread from Developing/Consistent** — only viable if manual set expectations first.
- **Hybrid:** Shooter level gate-free; **starred / program honors** use spread checklist from manual.

**Priority 3 — Streak ladder**

- Fix break-vs-hold incentives (streak section above).

**Priority 4 — Shooting marginal incentive**

- Promote weekly thresholds or small volume bonus on high-shot days.

**Priority 5 — Clean Week 1 launch**

- Rules, gates, manual, and Airtable config **live day 1** — no mid-stream introduction (2025–26 lesson).

**Deprioritized**

- Surprise cliff at Deadeye-only gates without prior manual/comms.
- Announcing HW importance for the first time at week 8+.

---

## Season simulator (for 2026–27 planning)

```
Shooting-only ceiling ≈ submission_days × 20 XP
Full-program ≈ (days×20) + (HW×35) + (videos×25) + zoom + streaks + milestones

One level (shooting-only) ≈ 10 counted days
Gate at level L (rough) ≈ scale homework ~(L−6)×2 for levels 7– constellations
```

**Sanity check:** Median 14 submission days ≈ 280 shooting XP → Rookie/Developer — matches observed cluster. Hot Hand (~50 days or equivalent XP from mix) is appropriately hard; **homework habit** is the missing bridge for gated levels.

---

## Related docs & code

| Resource | Purpose |
|----------|---------|
| [submission-to-xp-flow.md](./data-flow/submission-to-xp-flow.md) | Submission → XP |
| [automation-index.md](./automation-index.md) | 010, 042, 053, 054, 059, 066 |
| `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | Gate logic |
| `053-*-rebuild-and-upsert-from-submissions.js` | Streak block + repeat-after-break |
| `054-*-create-or-repair-streak-xp-event.js` | Streak XP award |
| XP Reward Rules / Levels / Level Gate Rules tables | Config layer |

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-06-29 | Initial draft from season-close data pull + ops review. Deferred until post–challenge. User context: first XP/level year, mid-stream rollout, last-year shot culture. |
| 2026-06-29 | Dual player model brainstorm — shooting-only vs all-encompassing; parent workload; parallel rank options. |
| 2026-06-29 | Game manual first + graduated gates spread across season; Week 0 comms checklist. |
