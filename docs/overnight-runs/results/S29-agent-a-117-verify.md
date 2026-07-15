# S29 — Automation 117 verify checklist

| Behavior | Offline / contract | Notes |
|----------|--------------------|-------|
| Needs Review normalize | PASS (L01) | Clear Review Status → Needs Review |
| Satisfactory | PASS (L05) | Coach path + Approved formulas |
| Needs Correction | PASS (L14) | Clears sat; deactivates XP when unapproved/conflict |
| Conflict | PASS (L08) | `deactivated_on_conflict` |
| XP create | PASS (L05) | One ZOOM_CREDIT per key; recheck-before-create |
| XP update | PASS (L07) | Amount move |
| XP deactivate | PASS (L08) | Active?=false |
| XP reactivate | PASS (L09) | Active?=true |
| Gate credit | PASS (L10–L11) | Independent applied flag |
| Perfect Week credit | PASS (L12–L13) | Independent applied flag |
| Repeated edits | PASS (R1/self-gates) | Idempotent skips |
| Duplicate Enrollment+Meeting | PASS (L03) | `skipped_duplicate_pair` |
| Recursive-trigger safety | PASS (design + R2) | Steps skip when already applied |
| No-email behavior | PASS (L18–L19) | blank webhook → never `sent` |
| No duplicate Zoom XP vs 101 | PASS (L16–L17) | Different keys; do not arm Create XP Events |

**Offline totals (S29):** smoke **22/22** · unittest **34/34** · **enabled 117? No**
