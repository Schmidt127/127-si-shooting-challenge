# Season Launch Go-Live Checklist

**Timezone:** America/Denver  
**Prerequisite:** Launch state ≥ Test Passed; Mike operational approval  

## A. Repository

- [ ] `node tests/challenge-year/challenge-year-engine.test.js` PASS  
- [ ] `node tests/challenge-year/season-launch-control.test.js` PASS  
- [ ] `node tools/challenge-year/cli.js audit-automations` PASS or accepted warnings  
- [ ] `launch-preflight --config <NEW> --input <export>` PASS / accepted PASS WITH WARNINGS  
- [ ] Week package generated and archived under Launch Evidence  

## B. Airtable PROD

- [ ] New Config dates + Active School Year set  
- [ ] Exactly one intended current Config  
- [ ] Weeks imported (Week 0, regulars, Post-Challenge)  
- [ ] Week Sunday–Saturday validated  
- [ ] Schmidt Enrollment linked to new year  
- [ ] Optional Launch Status fields created only if Mike authorized  

## C. Fillout

- [ ] Enrollment hidden defaults → new year / Program Instance / Config  
- [ ] Prior-year hard-codes removed  
- [ ] Schmidt test enrollment PASS  
- [ ] Daily form remains OFF until SC-146 gate  

## D. Automations

- [ ] Season-sensitive list reviewed (001–005, 010, 020, 031, 034, 041–042, 053–059, 066, 072, 074, 101, 114, 118, 119)  
- [ ] No disallowed hard-coded year in scripts (repo audit)  
- [ ] 074 sendMode=Live (or blank + WAS Live)  
- [ ] 118/119 remain ON unless explicit abort — schedules Sun 5:00 / 10:00 Denver  

## E. Make

- [ ] `Weekly Athlete Summary - Bulk Email - May 18` ON  
- [ ] No old-year pin on email scenario  
- [ ] Live writeback verified on Schmidt  

## F. Website (`/shoot`)

- [ ] Season filters attested (W-ATT-*)  
- [ ] `/shoot` leaderboard season truth checked  
- [ ] Softr treated as Obsolete / Not Used (not a launch gate)  

## G. Activation

- [ ] `activation-preview` reviewed — proposed changes accepted  
- [ ] Launch state → Approved for Live → Live  
- [ ] Evidence URL recorded  
- [ ] First Sunday monitoring plan set  

## H. Post-activation monitoring (first 7 days)

- [ ] WAS uniqueness after 118  
- [ ] Email send/writeback after 119/074/Make  
- [ ] No cross-season XP  
- [ ] Enrollment Active? hygiene  
