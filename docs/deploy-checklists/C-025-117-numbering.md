# C-025 / 117 numbering note

**Date:** 2026-07-15  
**Status:** Corrected after architecture reconciliation  
**See:** [C025_ARCHITECTURE_RECONCILIATION.md](../v2/C025_ARCHITECTURE_RECONCILIATION.md)

Two incompatible designs reused the **117** family. Do not conflate them.

## A. S16 / PR #26 (Homework Completions) — current repo package

| Number | Status | Role |
|--------|--------|------|
| **117a** | **Implemented in repo** (`117a-zoom-recording-credit-award-xp-from-quiz-completion.js`) | Award recording XP on Satisfactory quiz; optional `Recording Attendees` gate link |
| **117b** | **Implemented in repo** (`117b-zoom-recording-credit-send-approval-email-webhook.js`) | Parent email after Satisfactory when Config enabled |
| **117c** | **Not a separate script** | Stage 17 XP create/soft-void responsibility is **folded into S16 117a** (award-time exclusivity only — post-award soft-void still open) |
| **117d** | **Not a separate script** | Stage 17 gate roster responsibility is **folded into S16 117a** (`Recording Attendees`) — **Total Zoom Attendances** formula still required |
| **117e** | **Not implemented** | Stage 17 Perfect Week roster responsibility is **still required as behavior** — **057** must count recording credit when Config allows (gap) |
| **117f** | **Not a separate script** | Stage 17 email responsibility is **folded into S16 117b** |

Live attendance remains **101** unchanged. Overnight sibling name **101r** is retired in favor of **117a/117b**.

## B. Stage 17 overnight (Zoom Attendance) — recovery / alternate path

| Number | Stage 17 role | Disposition under S16 |
|--------|---------------|------------------------|
| 117a | Normalize ZA quiz row | Not needed if HC is proof row |
| 117b | Coach review / Needs Correction on ZA | Coach marks HC Satisfactory instead |
| 117c | Create/soft-void XP from `ZOOM_CREDIT\|…` | Replaced by S16 **117a** + different Source Key |
| 117d | Gate credit via meeting roster | Replaced by S16 **117a** → `Recording Attendees` (+ formula) |
| 117e | Perfect Week credit via roster for **057** | **Open gap** — not fully replaced |
| 117f | Approval email | Replaced by S16 **117b** |

**Do not** claim 117c–f are obsolete because **101** performs those jobs. **101 does not.**

**Do not** paste Stage 17 scripts alongside S16 117a/b without Mike choosing a single intake path.
