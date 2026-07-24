# Mike Actions — WAS / weekly email

**Updated:** 2026-07-24 (Schmidt E2E verified)

## Done

1. ~~Decide empty-week email policy~~ → **`send_short`**
2. ~~Paste/enforce 072 v4.0~~ → verified `built_short_empty_week`
3. ~~Controlled Schmidt Test send~~ → Gmail Check-In delivered via 119→074→Make
4. ~~Confirm Make scenario~~ → `Weekly Athlete Summary - Bulk Email - May 18`

## Do now (safety)

1. Confirm post-test inputs: 072 `allowSchmidtInput=false`; 118/119 `dryRun=true`, `includeSchmidt=false`.  
2. Keep **118 / 119 schedules OFF** until Live season activation is authorized.  
3. Keep **074 ON** and Make Bulk Email scenario **ON**.

## Before Live Sunday schedules

1. Explicit written authorization to enable 118 (5:00 AM) and 119 (10:00 AM) America/Denver.  
2. Decide whether Make Test-branch should write Sent? (currently does not).  
3. Optional: confirm 074 UI script header vs repo **v2.1**.

## Do not

- Treat **119** as the Make webhook sender (074 posts the webhook).  
- Create a new Make email scenario (use Bulk Email May 18).  
- Use Make `Weekly Athlete Summary Updated` as the email sender.  
- Re-enable Schmidt allow flags for unattended runs.
