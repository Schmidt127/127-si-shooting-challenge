# Agent 4 — Rollback Checklist

## Immediate safety (P0)

- [ ] OFF 118/119 if emails misfire
- [ ] Fix or disable 074 if wrong sendMode / wrong content mass-sending
- [ ] Do **not** mass-uncheck `Weekly Email Sent?`
- [ ] Do **not** delete WAS / XP / Enrollment rows

## Script / trigger / field / Make

1. Restore last good Git SHA (or Make blueprint export / version history).
2. Re-verify inputs and webhook URL.
3. One Schmidt/controlled proof only.
4. Record rollback SHA + incident note.

## Live email activation rollback

1. Schedules OFF for 118/119.
2. Leave Sent? history intact.
3. Document affected WAS IDs.
