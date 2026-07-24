# Mike Actions — WAS / weekly email

**Updated:** 2026-07-24 (Live writeback verified; 074 sendMode corrected)

## Done

1. ~~Decide empty-week email policy~~ → **`send_short`**
2. ~~Paste/enforce 072 v4.0~~ → verified `built_short_empty_week`
3. ~~Controlled Schmidt Test send~~ → Gmail Check-In delivered via 119→074→Make
4. ~~Confirm Make scenario~~ → `Weekly Athlete Summary - Bulk Email - May 18`
5. ~~074 PROD sendMode correction~~ → fixed `Test` → **`Live`**; Make Live writeback PASS (`Weekly Email Sent?`, `Make Send Status=Sent`, timestamp)

## Do now (safety)

1. Confirm post-test inputs: 072 `allowSchmidtInput=false`; 118/119 `dryRun=true`, `includeSchmidt=false`.  
2. Keep **118 / 119 schedules OFF** until Live season activation is authorized.  
3. Keep **074 ON** and Make Bulk Email scenario **ON**.  
4. Keep **074** automation input **`sendMode=Live`** (or blank + WAS Live) — **never** fixed `Test` in PROD.

## Before Live Sunday schedules

1. Explicit written authorization to enable 118 (5:00 AM) and 119 (10:00 AM) America/Denver.  
2. Optional: Make Test-branch Sent? writeback parity (not required for Live season).

## Do not

- Force **074** `sendMode=Test` as a permanent PROD automation input.  
- Treat **119** as the Make webhook sender (074 posts the webhook).  
- Create a new Make email scenario (use Bulk Email May 18).  
- Use Make `Weekly Athlete Summary Updated` as the email sender.  
- Re-enable Schmidt allow flags for unattended runs.
