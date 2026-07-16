"use strict";

const fs = require("fs");
const path = require("path");
const { FIXTURES_DIR, SUPPORTED_LIVE_TESTS } = require("./constants");
const { SafetyError } = require("./safety");
const { addOwnedRecord } = require("./run_state");

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), "utf8"));
}

function loadIds() {
  return loadFixture("ids").ids;
}

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Scenario handlers return a plan object and optionally mutate run-state when executing.
 * Live writes only occur when client.dryRun === false (CLI gates --execute separately).
 */
const SCENARIOS = {
  A3: {
    id: "A3",
    title: "Submission gets enrollment + week",
    fixture: "enrollment",
    automations: ["023", "005"],
    expectedResult:
      "Created Submission linked to test Enrollment; Week assigned; Denver activity date key correct.",
    async plan({ enrollmentId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      const activityDate = isoDateDaysAgo(1);
      return {
        preTestState: {
          enrollmentId: enr,
          require: ["Enrollment exists in DEV", "023/005 ON in DEV"],
          activityDate,
        },
        writes: [
          {
            table: "Submissions",
            kind: "create",
            fields: {
              Enrollment: [enr],
              "Activity Date": activityDate,
              "Shot Total": 25,
              "Count This Submission?": true,
            },
          },
        ],
        reads: [
          { table: "Submissions", purpose: "confirm Enrollment + Week links" },
        ],
      };
    },
    async execute({ client, plan, state }) {
      let next = { ...state, preTestState: plan.preTestState };
      const created = [];
      for (const write of plan.writes) {
        const result = await client.createRecord(write.table, write.fields);
        if (result.dryRun) {
          created.push({ table: write.table, id: "(dry-run)", kind: "create" });
        } else if (result.id) {
          next = addOwnedRecord(next, { table: write.table, id: result.id, kind: "create" });
          created.push({ table: write.table, id: result.id, kind: "create" });
        }
      }
      return {
        state: next,
        actualResult: client.dryRun
          ? "DRY-RUN: would create Fillout-shaped Submission; no Airtable write performed."
          : `Created ${created.length} Submission record(s). Operator must confirm Week link + automation 023/005 outputs.`,
        automationEvidence: "Expect automations 023, 005. Capture statusOut from Airtable run history.",
        recordsCreated: created,
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },

  B1: {
    id: "B1",
    title: "First counted submission day awards XP",
    fixture: "submission_xp",
    automations: ["010"],
    expectedResult: "One XP Event with Source Key SUBMISSION_XP|{submissionId}",
    async plan({ enrollmentId, submissionId }) {
      const ids = loadIds();
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          submissionId: submissionId || null,
          require: [
            "Counted Submission exists (prefer A3 output)",
            "No existing SUBMISSION_XP for that submission",
            "010 ON in DEV",
          ],
        },
        writes: submissionId
          ? []
          : [
              {
                table: "Submissions",
                kind: "create",
                fields: {
                  Enrollment: [enrollmentId || ids.enrollment],
                  "Activity Date": isoDateDaysAgo(0),
                  "Shot Total": 30,
                  "Count This Submission?": true,
                },
              },
            ],
        reads: [{ table: "XP Events", purpose: "count Source Key SUBMISSION_XP|{id}" }],
      };
    },
    async execute({ client, plan, state }) {
      let next = { ...state, preTestState: plan.preTestState };
      const created = [];
      for (const write of plan.writes) {
        const result = await client.createRecord(write.table, write.fields);
        if (result.dryRun) {
          created.push({ table: write.table, id: "(dry-run)", kind: "create" });
        } else if (result.id) {
          next = addOwnedRecord(next, { table: write.table, id: result.id, kind: "create" });
          created.push({ table: write.table, id: result.id, kind: "create" });
        }
      }
      return {
        state: next,
        actualResult: client.dryRun
          ? "DRY-RUN: would ensure counted Submission then observe 010 XP create."
          : "Submission ensured. Confirm exactly one XP Event Source Key SUBMISSION_XP|{submissionId}.",
        automationEvidence: "Automation 010 — paste statusOut/actionOut + Source Key.",
        recordsCreated: created,
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },

  B2: {
    id: "B2",
    title: "Same submission automation rerun (no second XP)",
    fixture: "submission_xp",
    automations: ["010"],
    expectedResult: "Skip/repair; no second XP Event for same Source Key",
    async plan({ submissionId }) {
      return {
        preTestState: {
          submissionId: submissionId || null,
          require: ["B1 already awarded", "Re-run 010 only — do not create second submission"],
        },
        writes: [],
        reads: [{ table: "XP Events", purpose: "count unchanged after 010 rerun" }],
        operatorAction: "Re-run automation 010 on the awarded submission in Airtable UI/API test.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: client.dryRun
          ? "DRY-RUN: would snapshot XP count, re-run 010, confirm count unchanged."
          : "No writes by CLI. Operator re-ran 010; record actual Event count in evidence.",
        automationEvidence: "010 rerun — expect skip_existing / repair; Event count delta 0.",
        recordsCreated: [],
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },

  F1: {
    id: "F1",
    title: "Cross single milestone threshold",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "One unlock SHOT_MILESTONE|{enrollmentId}|{milestoneId}",
    async plan({ enrollmentId }) {
      const ms = loadFixture("milestones");
      const ids = loadIds();
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          beforeShots: ms.synthetic_crossing.before_shots,
          afterShots: ms.synthetic_crossing.after_single,
          require: ["Enrollment cumulative shots below threshold", "066 ON", "Fillout-shaped counted submissions"],
        },
        writes: [
          {
            table: "Submissions",
            kind: "create",
            fields: {
              Enrollment: [enrollmentId || ids.enrollment],
              "Activity Date": isoDateDaysAgo(0),
              "Shot Total": 30,
              "Count This Submission?": true,
            },
            note: "May need multiple counted days to cross threshold — operator adjusts Shot Total / history",
          },
        ],
        reads: [{ table: "Achievement Unlocks", purpose: "SHOT_MILESTONE source keys" }],
      };
    },
    async execute({ client, plan, state }) {
      let next = { ...state, preTestState: plan.preTestState };
      const created = [];
      for (const write of plan.writes) {
        const result = await client.createRecord(write.table, write.fields);
        if (result.dryRun) {
          created.push({ table: write.table, id: "(dry-run)", kind: "create" });
        } else if (result.id) {
          next = addOwnedRecord(next, { table: write.table, id: result.id, kind: "create" });
          created.push({ table: write.table, id: result.id, kind: "create" });
        }
      }
      return {
        state: next,
        actualResult: client.dryRun
          ? "DRY-RUN: would create counted Submission toward single threshold crossing."
          : "Submission created for milestone path. Confirm one new SHOT_MILESTONE unlock.",
        automationEvidence: "066 — unlock Source Key + statusOut.",
        recordsCreated: created,
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },

  F2: {
    id: "F2",
    title: "Cross multiple milestone thresholds same run",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "One unlock per newly crossed milestone",
    async plan({ enrollmentId }) {
      const ms = loadFixture("milestones");
      const ids = loadIds();
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          beforeShots: ms.synthetic_crossing.before_shots,
          afterShots: ms.synthetic_crossing.after_multi,
          require: ["Enrollment can jump across 2+ thresholds via counted shots", "066 ON"],
        },
        writes: [
          {
            table: "Submissions",
            kind: "create",
            fields: {
              Enrollment: [enrollmentId || ids.enrollment],
              "Activity Date": isoDateDaysAgo(0),
              "Shot Total": 170,
              "Count This Submission?": true,
            },
          },
        ],
        reads: [{ table: "Achievement Unlocks", purpose: "multiple new SHOT_MILESTONE keys" }],
      };
    },
    async execute({ client, plan, state }) {
      let next = { ...state, preTestState: plan.preTestState };
      const created = [];
      for (const write of plan.writes) {
        const result = await client.createRecord(write.table, write.fields);
        if (result.dryRun) {
          created.push({ table: write.table, id: "(dry-run)", kind: "create" });
        } else if (result.id) {
          next = addOwnedRecord(next, { table: write.table, id: result.id, kind: "create" });
          created.push({ table: write.table, id: result.id, kind: "create" });
        }
      }
      return {
        state: next,
        actualResult: client.dryRun
          ? "DRY-RUN: would drive multi-threshold crossing submission."
          : "Multi-threshold submission created. Confirm one unlock per new milestone.",
        automationEvidence: "066 — list new Source Keys.",
        recordsCreated: created,
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },

  F3: {
    id: "F3",
    title: "Milestone rerun — no duplicate unlocks",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "No duplicate unlocks for same Source Key",
    async plan() {
      return {
        preTestState: {
          require: ["F1/F2 unlocks already exist", "Re-run 066 only"],
        },
        writes: [],
        reads: [{ table: "Achievement Unlocks", purpose: "count unchanged" }],
        operatorAction: "Re-run automation 066; compare unlock counts by Source Key.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: client.dryRun
          ? "DRY-RUN: would snapshot unlock keys, re-run 066, confirm no duplicates."
          : "No CLI writes. Operator confirmed 066 rerun idempotency in evidence.",
        automationEvidence: "066 rerun — unlock count delta 0 for existing Source Keys.",
        recordsCreated: [],
        result: client.dryRun ? "blocked" : "pass_pending_operator_confirm",
      };
    },
  },
};

function getScenario(testId) {
  const id = String(testId || "").toUpperCase();
  const scenario = SCENARIOS[id];
  if (!scenario) {
    throw new SafetyError(
      "unsupported_test_id",
      `No scenario handler for ${id}. Supported: ${SUPPORTED_LIVE_TESTS.join(", ")}`,
    );
  }
  return scenario;
}

module.exports = {
  SCENARIOS,
  getScenario,
  loadFixture,
  loadIds,
};
