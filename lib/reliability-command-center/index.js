/**
 * Shooting Challenge — Reliability Command Center
 *
 * Repository framework for workflow health audits (fixtures / exports).
 * Does not access live Airtable, send email, or invoke webhooks.
 *
 * Status: Built / Tested (repository). Airtable Interface: Designed (spec only).
 */

"use strict";

module.exports = {
  ...require("./health-status"),
  ...require("./normalize"),
  ...require("./validate"),
  ...require("./stale"),
  ...require("./conflicts"),
  ...require("./retry"),
  ...require("./issue"),
  ...require("./report"),
  ...require("./field-maps"),
  ...require("./runner"),
  checkEnrollment: require("./workflows/enrollment").checkEnrollment,
  checkSubmissions: require("./workflows/submissions").checkSubmissions,
  checkXpEvents: require("./workflows/xp-events").checkXpEvents,
  checkHomework: require("./workflows/homework").checkHomework,
  checkZoom: require("./workflows/zoom").checkZoom,
  checkVideoFeedback: require("./workflows/video-feedback").checkVideoFeedback,
  checkAchievements: require("./workflows/achievements").checkAchievements,
  checkLevels: require("./workflows/levels").checkLevels,
  checkWeeklyAthleteSummary: require("./workflows/weekly-athlete-summary")
    .checkWeeklyAthleteSummary,
  checkWeeklyEmail: require("./workflows/weekly-email").checkWeeklyEmail,
};
