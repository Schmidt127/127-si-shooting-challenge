# Live remaining-work audit — 2026-09-01

**Scope:** FUT-031–047 + automation paste queue vs live website, live Production schema, Hub email source.  
**Evidence:** fairfieldbasketballclub.com (Playwright + HTML), Airtable MCP `list_tables_for_base` (`appn84sqPw03zEbTT`), `communications` email templates.  
**Screenshots:** `docs/audits/landing-club-2026-09-01.png`, `docs/audits/landing-programs-2026-09-01.png`

## Automation paste queue

| Item | Verdict |
|------|---------|
| 010 / 020 / 022 / 057 / 065 / 072 / 073 | **No paste needed** — CURRENT-TRUTH paste queue empty; 065 v10.5 verified 2026-08-31 |
| Live schema | **35 tables / 1367 fields** (includes FUT-032 Parent Feedback Sent?/Delivery fields) |

## FUT-033–047 (brainstorm intake)

| ID | List said | Live verdict | Evidence |
|----|-----------|--------------|----------|
| **FUT-033** | Ready | **OPEN** | “What the club offers” still says “Jr. Ref.” and does **not** use approved Youth Programs / Coach Tools copy |
| **FUT-034** | Ready | **OPEN** | Live titles/copy use **Jr. Ref** / **Jr. Ref Clinic**; **Jr. Referee Clinic** count = 0 |
| **FUT-035** | Ready | **OPEN (partial)** | Footer already royal `#0034B7`; **#club** section still navy `rgb(6,26,67)` / `#061a43` |
| **FUT-036** | Ready | **OPEN** | Upcoming = **3** youth cards only (not six differentiated Youth + Coach Tools cards) |
| **FUT-037** | Blocked on images | **DONE** | Program photos live on Youth program cards; `/images/programs/*.jpg` HTTP 200 |
| **FUT-038** | Brief first | **NOT STARTED** | Config has review/XP toggles; **no** global category on/off system |
| **FUT-039** | Planning only | **DONE** (Mike) | Fillout CSS completed by operator 2026-09-01 |
| **FUT-040** | Brief first | **NOT STARTED** | Headshot + Writeback fields exist; auto migrate+delete pipeline not built |
| **FUT-041** | Ready | **OPEN** | Daily Submission Hub template has no **XP Earned \| Extra Credit** columns |
| **FUT-042** | Ready | **OPEN** | Coach feedback is plain text / InfoCard — not quotation styling (web + email) |
| **FUT-043** | Ready | **OPEN** | Design-system pass not done (still mixed card patterns) |
| **FUT-044** | Ready | **DONE (web)** | Athlete profile: **View Submitted Homework** present; **Submitted Work** card absent |
| **FUT-045** | Ready | **OPEN** | Web still prefers `Assignment Full Name` / Display over short `Assignment Title` |
| **FUT-046** | Ready | **OPEN** | Hub subject still `Homework Feedback for {Name}` (not Name + Assignment Name) |
| **FUT-047** | Ready | **OPEN** | Homework email still: “Reply to this email if you have questions…” |

## Already done (do not reopen)

| ID | Notes |
|----|-------|
| **FUT-031** | Live on Athlete1 Game Log: `Extra credit +N XP` taglines |
| **FUT-032** | Schema has Sent?/Sent On/Delivery fields; verified yesterday |
| **FUT-030** | Transactional reset complete |
| Paste baseline | 010/020/022/057/065/072/073 aligned |

## Actually left (prioritized)

1. Landing: **FUT-034** naming → **FUT-033** Scoreboard copy → **FUT-035** navy cleanup → **FUT-036** Upcoming redesign  
2. Hub/SC: **FUT-047** contact line → **FUT-046** subject → **FUT-045** Assignment Title → **FUT-041** daily XP columns → **FUT-042** quotation  
3. Later / brief-first: **FUT-043**, **FUT-038**, **FUT-040**  
4. Docs hygiene: flip Master List status for **037 / 039 / 031 / 044** to COMPLETE
