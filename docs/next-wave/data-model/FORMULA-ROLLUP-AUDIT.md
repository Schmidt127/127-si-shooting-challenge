# Formula & Rollup Audit

**Evidence:** `schema-snapshot` formulas + script date helpers (`America/Denver`)

---

## High-priority findings

| ID | Severity | Table | Field | Issue | Class |
|----|----------|-------|-------|-------|-------|
| FR-01 | High | Weeks | Week Key | Equals `RECORD_ID()` only — docs that describe year\|Week Name as Week Key are wrong | Doc mismatch |
| FR-02 | High | WAS | Summary Key vs Weekly Summary Key | Two identity formulas; second uses link **display** values | Prefer Summary Key |
| FR-03 | High | XP Events | XP Dedupe Key vs Normalized | Different component sets; scripts must follow registry (010/114 read Normalized carefully) | Keep both; never write |
| FR-04 | Medium | Enrollments | Gate Failure Summary - Formula vs Gate Summary | Near-duplicate gate messaging; one uses FIND("Pass") on numeric Gate Passes (suspect) | Cleanup later |
| FR-05 | Medium | Enrollments | Gate checks use `VALUE(ARRAYJOIN(lookup))` | Blank/array handling fragile if gate mins empty | Monitor |
| FR-06 | High | HC | Homework Completion Key | Built from primary displays of linked records | Rename-sensitive |
| FR-07 | Medium | WAS | Level Number | Hardcoded XP thresholds in formula — may disagree with Levels table / **042** | Potential dual source of truth |
| FR-08 | Medium | WAS | Weekly Goal Shots Target | `{Goal Shots Target}/9` assumes 9 challenge weeks | Season-length coupling |
| FR-09 | Medium | WAS | Met Minimum Days / Homework Completed? | Return 0/1 numbers pretending to be booleans | Type confusion |
| FR-10 | High | Weeks Start/End | dateTime America/Denver | Scripts must use Denver date keys — UTC ISO date slice caused 118 miss | Fixed in 118/119 v1.2+; tests exist |
| FR-11 | Medium | WAS | Combined Recipient Emails | Lookup→text concatenation; multi-value arrays may stringify oddly | Watch blank/array |
| FR-12 | Low | WAS | Homework Display | Emoji in formula (`🚫 No Homework`) | Cosmetic |
| FR-13 | Medium | Zoom Meetings | Effective* formulas | Cascade Meeting Override → Program Config → Global Config | Keep; complex but intentional |
| FR-14 | High | Submission Assets | Ready to Send to Make? | Formula gate for Make upload — distinct from WAS `Send to Make?` | Naming collision across tables |
| FR-15 | Unknown | WAS rollups | XP / shots / days | Depend on correct Submission/XP links; inactive/uncounted inclusion needs live view filters | Verify in OMNI |

---

## Date / timezone rules (authoritative for scripts)

| Rule | Detail | Evidence |
|------|--------|----------|
| Canonical TZ | America/Denver | automation standard + Week Start/End options |
| Week boundaries | Sunday start → Saturday end (challenge weeks) | business rules / 005 |
| Do not | `new Date("M/D/YYYY")` alone; UTC `.slice(0,10)` on Denver Saturday 23:59 | 118-119-week-key.test.js |
| Helpers | `toDateKeyFromText` / `toDateKeyFromDateObject` / 118 `dateKeyFromCell` | repo-script |

---

## Rollup contamination risks

| Rollup | Link | Risk if link polluted |
|--------|------|------------------------|
| WAS XP Earned This Week | XP Events → Active XP Points | Inactive XP Events still linked |
| WAS Total Shots This Week | Submissions → Total Shots Counted | Uncounted / wrong-week submissions linked |
| WAS Days Logged | Submissions → Counted Activity Date Key | Duplicate dates / non-counted |
| WAS Homework counts | Homework Completions Link | HC for wrong week if link wrong |

Mitigation: keep link writers (031 and XP creators) strict; use Counted* fields; do not “fix” by rewriting historical links casually.

---

## Formula vs script disagreement watchlist

| Topic | Formula side | Script side | Action |
|-------|--------------|-------------|--------|
| Levels | WAS `Level Number` thresholds | **042** + Levels table | Treat Levels/**042** as authoritative for enrollment; WAS formula is email/display until reconciled |
| Empty week email | n/a | **072** `emptyWeekPolicy` | Script owns policy |
| Sent? | checkbox + Make Send Status + Summary Email Status | Make Live writeback | Make owns final Sent? |
| Threshold XP | WAS Threshold* status fields | **No repo writer** | Hunt UI / mark gap |

---

## Percentage / boolean storage inconsistency

- Percent formulas on Enrollments (FG%) use Airtable percent type — OK.  
- Gate “Meets*” and WAS “Met Minimum Days?” use **number 0/1** — treat as numeric in scripts, not true/false checkboxes.  
- Many Ready/Sent flags are checkboxes; parallel single-select status fields exist on WAS — see cleanup classification.
