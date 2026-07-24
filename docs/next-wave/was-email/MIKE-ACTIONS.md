# Mike Actions — WAS / weekly email

**Updated:** 2026-07-24 (schedules ON; Live writeback verified)

## Done

1. ~~Decide empty-week email policy~~ → **`send_short`**
2. ~~Paste/enforce 072 v4.0~~ → verified `built_short_empty_week`
3. ~~Controlled Schmidt send~~ → Gmail Check-In via 119→074→Make
4. ~~Confirm Make scenario~~ → `Weekly Athlete Summary - Bulk Email - May 18`
5. ~~074 PROD sendMode correction~~ → **`Live`**; Make Live writeback PASS
6. ~~Authorize and enable 118/119 schedules~~ → **ON** (Sun 5:00 / 10:00 AM America/Denver)

## Keep true (do not undo)

1. **074** `sendMode=Live` (or blank + WAS Live) — **never** fixed `Test`.
2. **118 / 119 schedules ON** — do not disable based on older OFF guidance.
3. **072 / 074 / Make Bulk Email May 18 ON**.
4. Prefer 072 `allowSchmidtInput=false` for unattended season traffic.
5. **118** season inputs: `dryRun=false`, `sendMode=Live`, `includeSchmidt=false` (paste **v1.5** if UI still v1.4).
6. **119** season input: `dryRun=false`.

## Monitor

1. First live Sunday: WAS create volume, email volume, Sent? writebacks, duplicate WAS check.
2. Confirm dryRun/includeSchmidt/sendMode inputs match Live season posture in UI (see [`../go-live/MIKE-ACTIONS.md`](../go-live/MIKE-ACTIONS.md)).

## Do not

- Force **074** `sendMode=Test` as permanent PROD input.  
- Treat **119** as the Make webhook sender.  
- Create a new Make email scenario.  
- Use Make `Weekly Athlete Summary Updated` as the email sender.
