/*
Automation: 122 - Achievements and Milestones - Stamp Goal Met Date
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: SUPERSEDED — DO NOT INSTALL
Last GitHub Update: 2026-09-05 (superseded by 066 v4.1)

Purpose:
SUPERSEDED stub. Goal Met Date ownership moved to Automation 066.
Do not create or paste this automation (Airtable capacity full).

Notes:
See docs/deploy-checklists/SC-163-goal-met-date.md
*/

/************************************************************
 * 122 - ACHIEVEMENTS AND MILESTONES
 * Stamp Goal Met Date — SUPERSEDED
 *
 * Version: v0.0-superseded
 * Date Written: 2026-09-05
 * Last Updated: 2026-09-05
 *
 * PURPOSE
 * - Intentionally non-runnable stub so future agents do not install 122.
 * - Production Goal Met Date writer is Automation 066 v4.1+.
 *
 * RETAINED PRODUCT RULES (implemented in 066 / lib/sc-163-goal-met-date.js)
 * - Goal Met? formula is authoritative for "met"
 * - Goal Met Date = first counted Activity Date crossing Target Goal Shots
 * - Never overwrite; never use NOW()/award dates
 * - Count This Submission? + Activity Date chronology (America/Denver)
 * - Fail closed when met but crossing unprovable
 *
 * THIS IS NOT
 * - An installable automation.
 *
 * FOLDER
 * - 06 - Achievements and Milestones
 *
 * AUTOMATION NAME
 * - 122 - Achievements and Milestones - Stamp Goal Met Date (SUPERSEDED)
 ************************************************************/

// @ts-nocheck

const SCRIPT = {
  scriptName: "122 - Achievements and Milestones - Stamp Goal Met Date",
  version: "v0.0-superseded",
  versionDate: "2026-09-05",
  originalWrittenDate: "2026-09-05",
  lastUpdated: "2026-09-05",
  folder: "06 - Achievements and Milestones",
  automationName: "122 - Achievements and Milestones - Stamp Goal Met Date (SUPERSEDED)",
};

throw new Error(
  "SC-163: Automation 122 is SUPERSEDED. Paste Automation 066 v4.1+ for Goal Met Date. Do not install 122."
);
