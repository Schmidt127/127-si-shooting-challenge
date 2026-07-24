# Agent 4 — Release Checklist (change-type)

Companion to [`docs/V2_RELEASE_CHECKLIST.md`](../../V2_RELEASE_CHECKLIST.md).

## A. Script replacement

- [ ] Commit SHA recorded; version/SCRIPT metadata updated if logic changed
- [ ] `node tools/testing/run-agent4-suite.js` PASS
- [ ] DEV paste + named smoke; promotion doc if DEV→PROD
- [ ] Re-verify 074 inputs (`sendMode`, webhook, testRecipientEmail)
- [ ] CHANGELOG if production-impacting

## B. Trigger change

- [ ] Old vs new documented; no duplicate writers; capacity check; rollback text saved

## C. Field change

- [ ] No primary-field change without migration; no deletes; schema snapshot; consumer review

## D. Make blueprint change

- [ ] Export before edit; WAS sender remains `Weekly Athlete Summary - Bulk Email - May 18`
- [ ] Test branch: no Sent? writeback; Live: Sent?/status/timestamp after Gmail
- [ ] Controlled Test then Schmidt Live proof before parent blast

## E–F. Fillout / Softr

- [ ] Field keys match intake automations; DEV first; one shaped submission through XP

## G. Live email activation

- [ ] 072 `allowSchmidtInput=false`; 074 **sendMode=Live** (never fixed Test)
- [ ] 118/119 dryRun/exclusions reviewed; empty-week policy intentional
- [ ] Schedules ON only with Mike approval; first Sunday watched

## H. Yearly rollover

- [ ] New Config + Weeks; preserve history; Stages A–J dry-run; update PROJECT_STATE
