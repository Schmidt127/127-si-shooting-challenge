# Field ownership audit — status / queue / send fields

**Date:** 2026-07-24

## Weekly Athlete Summary email fields

| Field | Authoritative writer | Notes |
|-------|---------------------|-------|
| `Build Weekly Email Now?` | **118** arm / **072** consume | |
| `Weekly Email Ready?` + package fields | **072** | |
| `Send to Make?` | **119** arm / **074** clear | Retry on fail intentional |
| `Weekly Email Sent?` | **Make Live** | 074 must not clear |
| `Make Send Status` | **Make Live** | verified_prod 2026-07-24 |
| Sent timestamp | **Make Live** | |
| `Weekly Email Error` | **074** | |
| `sendMode` | 072/118 set; 074 resolve | Fixed Test on 074 = incident |

## Other critical owners

| Field | Writer |
|-------|--------|
| Submission `XP Award Status` | 010 (+ optional 008) |
| Enrollment levels | **042** (041 flags) |
| Zoom Meetings.Attendees | Live/101 only — **117 forbidden** |
| XP `Source Key` | Creating XP script only |

Open multi-writer: WAS 031/101/118; HC 020/067; Zoom credit 117/117c; upload ladder + Make.
