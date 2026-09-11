# SC-171 — Daily Submission + Homework Feedback presentation

**Status:** **PENDING Production promotion**  
**Backlog:** SC-171  
**Production base:** `appn84sqPw03zEbTT`  
**No DEV base** — paste + Hub deploy + allowlisted test only.

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

**Closeout:** [`../audits/SC-171-EMAIL-HOMEWORK-PRESENTATION-CLOSEOUT-20260906.md`](../audits/SC-171-EMAIL-HOMEWORK-PRESENTATION-CLOSEOUT-20260906.md)

---

## What ships

1. **Automation 076 v8.14** — Remove `xpExtraCredit` / `shootingPercentage` from daily handoff payload; compute `currentStreak` from counted submissions (055-aligned); add `athleteFirstName`.
2. **Automation 071 v4.5** — SC-171 presentation fields (`submittedDate`, `reviewedDate`, `athleteProfileUrl`) plus Structured Curriculum HC-only asset path (v4.5).
3. **Communications Hub** — Daily Submission template (no Extra Credit / Shooting %); Homework Feedback template (SC-171 presentation + View Athlete Details).

---

## Promotion order

| # | Step | Owner | Done |
|---|------|-------|------|
| 1 | Merge GitHub PRs (shooting-challenge + communications) | Mike / agent | [ ] |
| 2 | Paste **076** docblock → end into Production automation (skip GitHub header) | Mike | [ ] |
| 3 | Paste **071** docblock → end into Production automation (skip GitHub header) | Mike | [ ] |
| 4 | Deploy Communications Hub (Vercel) with updated templates | Mike | [ ] |
| 5 | Confirm Production deploy READY | Mike | [ ] |
| 6 | Live verify with disposable test records + allowlist only | Mike | [ ] |

---

## Airtable paste sources

| Automation | GitHub file | Version |
|---|---|---|
| 076 | `airtable/automations/shooting-challenge/076-email-notifications-and-external-handoffs-build-daily-submission-email-package.js` | **v8.14** — [`076-v8.14-PASTE.txt`](./076-v8.14-PASTE.txt) |
| 071 | `airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js` | **v4.5** — [`071-v4.5-PASTE.txt`](./071-v4.5-PASTE.txt) |

**Full Tier 1 packet (all six email producers + SC-172 + Hub + Zoom):** [`TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md`](./TIER-1-LAUNCH-OPS-RUNBOOK-20260911.md)

Verify Production `Automations` table **Name / Status / Automation Code** matches GitHub after paste.

---

## Live verification matrix

Use **only** approved test/allowlist recipients. No real family emails.

### Daily Submission

| Check | Expected |
|---|---|
| Extra Credit XP row | Absent |
| Shooting Percentage | Absent |
| XP Earned | Present |
| Current Day Streak | Matches post-submission counted-day sequence (not stuck on prior day) |
| Consecutive days | 11 → 12 → 13 on three consecutive qualifying submissions |

### Homework Feedback

| Check | Expected |
|---|---|
| Program | Absent |
| HW1 / HW2 / Slot | Absent |
| Assignment name | Prominent near top (canonical title, not Full Assignment Name) |
| Submitted Date | From HC Submission Date |
| Reviewed Date | From HC Reviewed At |
| Section title | Homework Files Uploaded |
| Primary CTA | View Athlete Details |
| CTA URL | `/shoot/athletes/{slug}` — no `rec...` in browser URL |
| Coach Feedback | Quotation block styling intact |

### Public athlete route

| Check | Expected |
|---|---|
| URL pattern | `https://www.fairfieldbasketballclub.com/shoot/athletes/{Public Profile Slug}` |
| HTTP | 200 for enabled public profile |
| Missing profile | Graceful fallback (homework page link), not broken link |

---

## Rollback

- Re-paste prior Live automation versions from git history if needed.
- Redeploy prior Communications Hub commit.
- No schema changes — rollback is script + template only.
