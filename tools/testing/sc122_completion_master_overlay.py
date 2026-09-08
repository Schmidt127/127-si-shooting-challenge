from pathlib import Path

path = Path("docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md")
text = path.read_text(encoding="utf-8")
marker = "\n---\n\n## 0. Current Status Dashboard — 2026-08-24\n"
heading = "## 0Z. Authoritative current-state overlay — 2026-09-08"

if heading in text:
    raise SystemExit("SC-122 overlay already present")
if marker not in text:
    raise SystemExit("Completion Master insertion marker not found")

overlay = r'''

## 0Z. Authoritative current-state overlay — 2026-09-08

> **This overlay supersedes the older “current” dashboards and issue-era statements below wherever they conflict.** Historical dated sections remain preserved evidence and are not being rewritten. For exact live automation versions, use `CURRENT-TRUTH.md`, the Automation Version Inventory, and the named GitHub issues/evidence.

### Controlled Production identity

- Athlete: `recshWT5DQPUZXDvr` — **Testing Schmidt**
- Enrollment: `recn54wbxTjygydqa` — 2026–2027 Shooting Challenge
- Program Instance: `rec5mEM0YPqPqq0hZ` — `Shooting Challenge | 2026-2027`
- Grade Band: `9-12`
- Test emails remain intentionally blank unless a specific allowlisted email test is authorized.
- The prior August Testing Schmidt identities are retired historical fixtures and must not be recreated or reused.

### Season calendar

The final 2027 challenge geometry is verified:

- Early Bird: Apr 25–May 1, 2027
- Week 1: May 2–May 8
- Week 2: May 9–May 15
- Week 3: May 16–May 22
- Week 4: May 23–May 29
- Week 5: May 30–Jun 5
- Week 6: Jun 6–Jun 12
- Week 7: Jun 13–Jun 19
- Week 8: Jun 20–Jun 26
- Week 9: Jun 27–Jun 30 (intentional partial terminal Week)
- Post-Challenge: Jul 1–Jul 3

Live Airtable readback confirmed Week 9 and Post-Challenge boundaries. Repository repair PR #495 is merged; Production paste/live proof for **057 v2.6 / 118 v2.1 / 119 v1.8** remains pending under #121.

### Homework and Structured Curriculum

- Homework scheduling is **PHA-first and just-in-time**. There is no fixed 90-row season seed.
- Automation 067’s PHA-first defect is resolved; issue #120 is closed Completed.
- Public Homework catalog/detail is PHA-first in repository source; #125 remains open only for final production runtime verification.
- Structured Curriculum file assets PR **#486** is merged (`04448e13c423306ca0d4afcf28f2a1cd394da65d`). Remaining cutover: paste **070a/070b v4.8**, remove only 070a trigger condition `Submission - Linked isNotEmpty`, then run the signed Shot Tracker file-upload E2E proving HC + Submission Asset + canonical URL and **0 Daily Submissions**.

### XP integrity and progression

- Issue #100 orphan XP cleanup/reconciliation is **closed Completed**. The authorized live cleanup reduced the exact `Active? = true AND Enrollment blank` population **52 → 0**; recurrence detection and bounded reconciliation controls are merged.
- Automation **042 remains the sole progression-output writer**. Automation 043 remains retired / do-not-recreate.
- Issues #98 and #118 are closed Completed; current 041/042 reconciliation architecture supersedes their older issue-era assumptions.
- Weekly Threshold / Perfect Week eligibility-loss issue #102 has repository reconciliation merged; controlled Production threshold withdrawal/regain/replay proof remains pending.
- Video XP source-safety issue #101 has repository repair merged (**113 v6.5 / 114 v6.3**); native Airtable paste and controlled lifecycle proof remain pending.

### Public website / SEO

- Public search indexing is **approved and deployed**; issue #56 is closed Completed.
- Public athlete profiles are intended to be indexable with Fairfield Basketball Club canonicals; stale `noindex` / “SEO deferred” rows below are historical and must not be used as current instructions.
- Protected/admin/API surfaces remain excluded from indexing.

### Email / Communications Hub

- Communications Hub → Resend remains the current Shooting Challenge email plane; Make/Gmail email paths are historical/retired where superseded.
- #104/#105 repository/source defects are superseded by later repairs; both remain open only for controlled disposable delivery/replay proof.
- Welcome contract #126 is repository-complete through **078A v1.7**, using deterministic key `WELCOME|SHOOTING_CHALLENGE|<Enrollment RID>`; native Airtable paste + one-send/replay proof remain pending.

### Current desktop Production cutover queue

1. Structured Curriculum: **070a v4.8 + trigger edit; 070b v4.8; signed Shot Tracker E2E**.
2. Season boundary: **057 v2.6 / 118 v2.1 / 119 v1.8** + boundary proof (#121).
3. Video XP safety: **113 v6.5 / 114 v6.3** + controlled lifecycle proof (#101).
4. Welcome: **078A v1.7** + one-send/replay proof (#126).
5. Weekly Threshold reconciliation: controlled dry-run/withdraw/regain/replay proof (#102).
6. Parent email: disposable HOMEWORK/VIDEO/DAILY/WEEKLY delivery/replay proofs (#104/#105).

### Issue reconciliation already completed on 2026-09-08

Closed Completed: **#56, #98, #100, #103, #118, #120**.  
Merged repository repairs include **#486, #489–#495, #497**.  
Still live-proof dependent: **#101, #102, #104, #105, #121, #125, #126**.

'''

text = text.replace(marker, "\n---\n" + overlay + "\n---\n\n## 0. Current Status Dashboard — 2026-08-24\n", 1)
lines = text.splitlines()
for i, line in enumerate(lines):
    if line.startswith("| **Last updated** |"):
        lines[i] = "| **Last updated** | **2026-09-08** — authoritative current-state overlay added by #122 reconciliation; historical sections preserved |"
        break
else:
    raise SystemExit("Completion Master Last updated row not found")

path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("SC-122 Completion Master overlay inserted")
