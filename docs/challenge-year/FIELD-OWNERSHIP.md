# Challenge-Year Field Ownership Notes

Companion to the broader ownership work in `docs/next-wave/automation-ownership/` and SC-046.

| Field / concern | Sole writer / owner | Notes |
|-----------------|---------------------|-------|
| Config.`Active School Year` | Human / ops | Year identity; resolver input |
| Config feature flags | Human / ops | Year-specific values intentional |
| Program Instance dates/status | Human / sync source | Calendar authority when linked |
| Weeks.`Week Name`, Start/End | Human (manual seed) | Generator produces import CSV only |
| Weeks.`Week Key` | Formula `RECORD_ID()` | Do not write |
| Proposed Weeks.`Challenge Week Key` | Formula/text (future) | Mike-authorized schema only |
| Proposed Weeks.`Week End Key` | Formula (future) | 118/119 currently derive from End Date |
| Enrollment.`School Year` | Fillout / intake | Must match challenge year |
| Enrollment.`Active?` | Human + limited automations | Historical must not stay active unintentionally |
| Enrollment.`Current Level` | **042** | Do not assume annual reset |
| Enrollment.`Grade Band` | 013/020/030 copy paths + intake | Link-ID preferred (066) |
| Submission.`Week` | **005** | Activity Date / homework-first |
| WAS row create | **031**, **101**, **118** | Identity Enrollment+Week |
| WAS.`Summary Key` | Formula | Never write |
| WAS email package / Sent? | **072** build; **074** webhook; Make Live writeback | Preserve chain |

Challenge-year preview scripts are **read-only** and must never become scheduled automations.
