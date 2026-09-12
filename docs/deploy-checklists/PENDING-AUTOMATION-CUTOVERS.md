# Pending Automation Cutovers

This file is a narrow repository-to-Production version registry for automation code that is intentionally ahead in GitHub while the native Airtable paste and live proof are still pending.

It is consumed by `tests/automation-contracts/docs-canonical-header.test.js`. A pending live version is accepted only when this file explicitly names the same canonical GitHub version found in the source header and marks the cutover as paste pending.

| Automation | GitHub Version | Live Version | State | Reason |
|---|---|---|---|---|
| **057** | **v2.7** | **v2.5** | **GitHub ahead / paste pending** | Perfect Week homework gate uses Week End Saturday only (not catch-up PHA Due Date). Supersedes pending v2.6 SC-121 paste; install v2.7 and live-prove. |
| **118** | **v2.1** | **v2.0** | **GitHub ahead / paste pending** | SC-121 weekly-summary scheduler repair for the partial terminal Week. |
| **119** | **v1.8** | **v1.7** | **GitHub ahead / paste pending** | SC-121 weekly-summary send scheduler repair for the partial terminal Week. |

Remove or update a row only when the native Airtable version and controlled live evidence establish the new Production truth.
