"use strict";

const fs = require("fs");
const path = require("path");
const { FIXTURES_DIR, SUPPORTED_LIVE_TESTS } = require("./constants");
const { SafetyError } = require("./safety");
const { addOwnedRecord, addRollbackPatch } = require("./run_state");

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

async function applyPlanWrites(client, plan, state) {
  let next = { ...state, preTestState: plan.preTestState };
  const created = [];
  for (const write of plan.writes || []) {
    if (write.kind === "update") {
      const result = await client.updateRecord(write.table, write.id, write.fields);
      if (result.dryRun) {
        created.push({
          table: write.table,
          id: write.id || "(dry-run)",
          kind: "update",
        });
      } else {
        next = addRollbackPatch(next, {
          table: write.table,
          id: write.id,
          previousFields: write.previousFields || {},
          appliedFields: write.fields,
        });
        created.push({ table: write.table, id: write.id, kind: "update" });
      }
      continue;
    }
    const result = await client.createRecord(write.table, write.fields);
    if (result.dryRun) {
      created.push({ table: write.table, id: "(dry-run)", kind: "create" });
    } else if (result.id) {
      next = addOwnedRecord(next, {
        table: write.table,
        id: result.id,
        kind: "create",
      });
      created.push({ table: write.table, id: result.id, kind: "create" });
    }
  }
  return { state: next, created };
}

function dryOrLive(client, dryMsg, liveMsg) {
  return client.dryRun ? dryMsg : liveMsg;
}

function resultCode(client) {
  return client.dryRun ? "blocked" : "pass_pending_operator_confirm";
}

/**
 * Scenario handlers return a plan object and optionally mutate run-state when executing.
 * Live writes only occur when client.dryRun === false (CLI gates --execute separately).
 *
 * Each scenario exposes `spec` for docs/tests: purpose, tables, setup, writes,
 * automations, outputs, cleanup, rollback, blockers.
 */
const SCENARIOS = {
  A3: {
    id: "A3",
    title: "Submission gets enrollment + week",
    fixture: "enrollment",
    automations: ["023", "005"],
    expectedResult:
      "Created Submission linked to test Enrollment; Week assigned; Denver activity date key correct.",
    spec: {
      purpose: "Verify intake links Enrollment + Week on Fillout-shaped Submission",
      requiredTables: ["Enrollments", "Submissions", "Weeks"],
      requiredFields: ["Submissions.Activity Date", "Submissions.Shot Total", "Submissions.Count This Submission?"],
      setup: ["DEV enrollment id", "023/005 ON"],
      writeOperations: ["create Submissions"],
      expectedAutomation: ["023", "005"],
      expectedOutputs: ["Enrollment linked", "Week linked", "Denver date key"],
      cleanup: ["Delete owned Submission via run-state"],
      rollback: ["Delete owned Submission"],
      blockers: ["Mike DEV auth", "real enrollment id"],
    },
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
        reads: [{ table: "Submissions", purpose: "confirm Enrollment + Week links" }],
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would create Fillout-shaped Submission; no Airtable write performed.",
          `Created ${created.length} Submission record(s). Confirm Week link + 023/005 outputs.`,
        ),
        automationEvidence: "Expect automations 023, 005. Capture statusOut from Airtable run history.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  B1: {
    id: "B1",
    title: "First counted submission day awards XP",
    fixture: "submission_xp",
    automations: ["010"],
    expectedResult: "One XP Event with Source Key SUBMISSION_XP|{submissionId}",
    spec: {
      purpose: "Award first counted-day Submission XP once",
      requiredTables: ["Submissions", "XP Events"],
      requiredFields: ["XP Events.Source Key", "Submissions.Count This Submission?"],
      setup: ["Counted Submission", "010 ON", "no prior SUBMISSION_XP for id"],
      writeOperations: ["create Submissions (unless submissionId provided)"],
      expectedAutomation: ["010"],
      expectedOutputs: ["SUBMISSION_XP|{submissionId} count=1"],
      cleanup: ["Retain XP for L1 or soft-void with Mike approval; delete owned Submission"],
      rollback: ["Delete owned Submission; do not mass-delete XP"],
      blockers: ["Mike DEV auth", "010 ON"],
    },
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
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would ensure counted Submission then observe 010 XP create.",
          "Submission ensured. Confirm exactly one XP Event Source Key SUBMISSION_XP|{submissionId}.",
        ),
        automationEvidence: "Automation 010 — paste statusOut/actionOut + Source Key.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  B2: {
    id: "B2",
    title: "Same submission automation rerun (no second XP)",
    fixture: "submission_xp",
    automations: ["010"],
    expectedResult: "Skip/repair; no second XP Event for same Source Key",
    spec: {
      purpose: "Prove 010 idempotency on rerun",
      requiredTables: ["XP Events"],
      requiredFields: ["XP Events.Source Key"],
      setup: ["B1 already awarded"],
      writeOperations: ["none (operator rerun 010)"],
      expectedAutomation: ["010"],
      expectedOutputs: ["Event count delta 0"],
      cleanup: ["none owned"],
      rollback: ["n/a"],
      blockers: ["Prior B1 evidence"],
    },
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
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot XP count, re-run 010, confirm count unchanged.",
          "No writes by CLI. Operator re-ran 010; record actual Event count in evidence.",
        ),
        automationEvidence: "010 rerun — expect skip_existing / repair; Event count delta 0.",
        recordsCreated: [],
        result: resultCode(client),
      };
    },
  },

  C4: {
    id: "C4",
    title: "Satisfactory homework review awards XP",
    fixture: "homework_completion",
    automations: ["064", "065"],
    expectedResult: "One XP Event HOMEWORK_XP|{homeworkCompletionId}",
    spec: {
      purpose: "Coach-satisfactory Homework Completion awards XP once",
      requiredTables: ["Homework Completions", "XP Events", "Enrollments"],
      requiredFields: [
        "Homework Completions.Satisfactory?",
        "Homework Completions.Enrollment",
        "XP Events.Source Key",
      ],
      setup: [
        "DEV enrollment",
        "Homework Assignment id (env DEV_HOMEWORK_ASSIGNMENT_ID or --assignment)",
        "064/065 ON",
      ],
      writeOperations: ["create Homework Completions (Satisfactory?=true)"],
      expectedAutomation: ["064", "065"],
      expectedOutputs: ["HOMEWORK_XP|{completionId} count=1"],
      cleanup: ["Delete owned Homework Completion; retain XP unless Mike approves soft-void"],
      rollback: ["Delete owned Homework Completion"],
      blockers: ["Coach review path", "curriculum assignment id", "Mike DEV auth"],
    },
    async plan({ enrollmentId, assignmentId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      const assignment = assignmentId || process.env.DEV_HOMEWORK_ASSIGNMENT_ID || "";
      const fields = {
        Enrollment: [enr],
        "Satisfactory?": true,
        "Award Status": "Pending",
      };
      if (assignment) fields["Homework Assignment"] = [assignment];
      return {
        preTestState: {
          enrollmentId: enr,
          assignmentId: assignment || null,
          require: [
            "064/065 available in DEV",
            "Homework Assignment linked when field required",
            "No prior HOMEWORK_XP for new completion",
          ],
        },
        writes: [{ table: "Homework Completions", kind: "create", fields }],
        reads: [{ table: "XP Events", purpose: "HOMEWORK_XP|{completionId}" }],
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would create Satisfactory Homework Completion for 065 XP path.",
          "Homework Completion created. Confirm one HOMEWORK_XP|{completionId} Event.",
        ),
        automationEvidence: "064/065 — statusOut/actionOut + Source Key HOMEWORK_XP|…",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  D3: {
    id: "D3",
    title: "Posted video feedback creates XP",
    fixture: "video_feedback",
    automations: ["114"],
    expectedResult: "One XP Event VIDEO_SUBMISSION|{videoFeedbackId}",
    spec: {
      purpose: "Ready-for-XP Video Feedback awards VIDEO_SUBMISSION XP once",
      requiredTables: ["Video Feedback", "XP Events", "Enrollments"],
      requiredFields: ["Video Feedback.Ready for XP Automation?", "XP Events.Source Key"],
      setup: ["DEV enrollment", "114 ON", "video feedback row path available"],
      writeOperations: ["create Video Feedback with Ready for XP Automation?=true"],
      expectedAutomation: ["114"],
      expectedOutputs: ["VIDEO_SUBMISSION|{vfId} count=1"],
      cleanup: ["Uncheck Ready flag if retained; delete owned VF row via run-state"],
      rollback: ["Delete owned Video Feedback"],
      blockers: ["114 ON", "Mike DEV auth"],
    },
    async plan({ enrollmentId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      return {
        preTestState: {
          enrollmentId: enr,
          require: ["114 ON in DEV", "No prior VIDEO_SUBMISSION for new VF"],
        },
        writes: [
          {
            table: "Video Feedback",
            kind: "create",
            fields: {
              Enrollment: [enr],
              "Ready for XP Automation?": true,
            },
          },
        ],
        reads: [{ table: "XP Events", purpose: "VIDEO_SUBMISSION|{vfId}" }],
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would create Video Feedback Ready for XP for 114.",
          "Video Feedback created. Confirm one VIDEO_SUBMISSION|{vfId} Event.",
        ),
        automationEvidence: "114 — statusOut/actionOut + Source Key VIDEO_SUBMISSION|…",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  F1: {
    id: "F1",
    title: "Cross single milestone threshold",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "One unlock SHOT_MILESTONE|{enrollmentId}|{milestoneId}",
    spec: {
      purpose: "Single shot-milestone unlock via 066",
      requiredTables: ["Submissions", "Achievement Unlocks", "Enrollments"],
      requiredFields: ["Submissions.Shot Total", "Achievement Unlocks / Source Key"],
      setup: ["Enrollment below threshold", "066 ON"],
      writeOperations: ["create counted Submission"],
      expectedAutomation: ["066"],
      expectedOutputs: ["one new SHOT_MILESTONE|enr|ms"],
      cleanup: ["Delete owned Submission; retain unlock for F3"],
      rollback: ["Delete owned Submission"],
      blockers: ["pipeline-ready shots", "Mike DEV auth"],
    },
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
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would create counted Submission toward single threshold crossing.",
          "Submission created for milestone path. Confirm one new SHOT_MILESTONE unlock.",
        ),
        automationEvidence: "066 — unlock Source Key + statusOut.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  F2: {
    id: "F2",
    title: "Cross multiple milestone thresholds same run",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "One unlock per newly crossed milestone",
    spec: {
      purpose: "Multi-threshold milestone unlocks in one 066 run",
      requiredTables: ["Submissions", "Achievement Unlocks"],
      requiredFields: ["Submissions.Shot Total"],
      setup: ["Enrollment can cross 2+ thresholds", "066 ON"],
      writeOperations: ["create high Shot Total counted Submission"],
      expectedAutomation: ["066"],
      expectedOutputs: ["one unlock per newly crossed milestone"],
      cleanup: ["Delete owned Submission; retain unlocks for F3"],
      rollback: ["Delete owned Submission"],
      blockers: ["Mike DEV auth", "066 ON"],
    },
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
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would drive multi-threshold crossing submission.",
          "Multi-threshold submission created. Confirm one unlock per new milestone.",
        ),
        automationEvidence: "066 — list new Source Keys.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  F3: {
    id: "F3",
    title: "Milestone rerun — no duplicate unlocks",
    fixture: "milestones",
    automations: ["066"],
    expectedResult: "No duplicate unlocks for same Source Key",
    spec: {
      purpose: "066 unlock Source Key idempotency",
      requiredTables: ["Achievement Unlocks"],
      requiredFields: ["Source Key / Milestone Source Key"],
      setup: ["F1/F2 unlocks exist"],
      writeOperations: ["none (operator rerun 066)"],
      expectedAutomation: ["066"],
      expectedOutputs: ["unlock count delta 0"],
      cleanup: ["none owned"],
      rollback: ["n/a"],
      blockers: ["Prior F1/F2"],
    },
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
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot unlock keys, re-run 066, confirm no duplicates.",
          "No CLI writes. Operator confirmed 066 rerun idempotency in evidence.",
        ),
        automationEvidence: "066 rerun — unlock count delta 0 for existing Source Keys.",
        recordsCreated: [],
        result: resultCode(client),
      };
    },
  },

  G3: {
    id: "G3",
    title: "Create Perfect Week unlock",
    fixture: "perfect_week",
    automations: ["057", "058"],
    expectedResult: "Unlock Source Key PERFECT_WEEK|{enrollmentId}|{weekId}",
    spec: {
      purpose: "Eligible week creates one Perfect Week unlock",
      requiredTables: ["Weekly Athlete Summary", "Enrollments", "Weeks", "Achievement Unlocks"],
      requiredFields: ["WAS.Enrollment", "WAS.Week"],
      setup: [
        "WAS for enrollment+week",
        "Required daily days + homework met (057 eligible)",
        "058 ON",
      ],
      writeOperations: [
        "create Weekly Athlete Summary if missing (Enrollment+Week)",
        "operator runs 057/058",
      ],
      expectedAutomation: ["057", "058"],
      expectedOutputs: ["PERFECT_WEEK|enr|week once"],
      cleanup: ["Delete owned WAS if created by this run; retain unlock for L2"],
      rollback: ["Delete owned WAS"],
      blockers: ["Eligible week state", "week id", "Mike DEV auth"],
    },
    async plan({ enrollmentId, weekId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      const week = weekId || process.env.DEV_TEST_WEEK_ID || ids.week;
      return {
        preTestState: {
          enrollmentId: enr,
          weekId: week,
          require: [
            "WAS present or creatable for enrollment+week",
            "057 eligibility already true (or operator completes days first)",
            "058 ON in DEV",
          ],
        },
        writes: [
          {
            table: "Weekly Athlete Summary",
            kind: "create",
            fields: {
              Enrollment: [enr],
              Week: [week],
            },
            note: "Skip create if WAS already exists — operator should pass existing via notes; duplicates prevented by 031 in live pipeline",
          },
        ],
        reads: [
          { table: "Weekly Athlete Summary", purpose: "eligible + unlock empty" },
          { table: "Achievement Unlocks", purpose: "PERFECT_WEEK|enr|week" },
        ],
        operatorAction: "Run 057 then 058 (or unlock path) after eligibility confirmed.",
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would ensure WAS row then rely on 057/058 for PERFECT_WEEK unlock.",
          "WAS ensure attempted. Confirm one PERFECT_WEEK|enr|week unlock (no second on rerun).",
        ),
        automationEvidence: "057/058 — Eligible flag + unlock Source Key.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  H2: {
    id: "H2",
    title: "Level gate blocked",
    fixture: "levels_gates",
    automations: ["042"],
    expectedResult: "Status Gate Blocked; Current level stays; Next = gated level",
    spec: {
      purpose: "XP enough but gate stats block level advance",
      requiredTables: ["Enrollments", "Level Gate Rules"],
      requiredFields: ["Enrollment level/status fields", "gate minimums"],
      setup: [
        "Enrollment Lifetime XP crosses next level",
        "Homework/videos below gate",
        "041/042 ON",
      ],
      writeOperations: [
        "optional update Enrollment Recalc Needed?=true (rollback patch stored)",
      ],
      expectedAutomation: ["042"],
      expectedOutputs: ["Status Gate Blocked"],
      cleanup: ["Rollback Enrollment patch via run-state previousFields"],
      rollback: ["Restore previous Enrollment fields from run-state"],
      blockers: ["Gate rules configured", "Mike DEV auth", "do not use PROD enrollment"],
    },
    async plan({ enrollmentId }) {
      const ids = loadIds();
      const lg = loadFixture("levels_gates");
      const enr = enrollmentId || ids.enrollment;
      return {
        preTestState: {
          enrollmentId: enr,
          syntheticGate: lg.synthetic_gate,
          require: [
            "Enrollment has XP >= next level",
            "Gate enabled with unmet homework/video mins",
            "042 ON",
          ],
        },
        writes: enrollmentId
          ? [
              {
                table: "Enrollments",
                kind: "update",
                id: enr,
                fields: { "Recalc Needed?": true },
                previousFields: { "Recalc Needed?": false },
                note: "Only patches test enrollment provided via --enrollment",
              },
            ]
          : [],
        reads: [{ table: "Enrollments", purpose: "Status / Current / Next after 042" }],
        operatorAction:
          "Confirm gate stats unmet; run 042; expect Gate Blocked. Provide --enrollment for optional Recalc patch.",
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot enrollment gate state / optional Recalc Needed patch.",
          plan.writes.length
            ? "Recalc Needed patched on test enrollment. Confirm Status=Gate Blocked after 042."
            : "No enrollment patch (pass --enrollment). Operator confirmed Gate Blocked in evidence.",
        ),
        automationEvidence: "042 — Status Gate Blocked; Current unchanged.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  J1: {
    id: "J1",
    title: "Zoom live attendance base XP",
    fixture: "zoom_attendance",
    automations: ["101"],
    expectedResult: "One XP Event ZOOM_ATTEND_BASE|{meetingId}|{enrollmentId}",
    spec: {
      purpose: "Live Zoom attendance awards base XP once",
      requiredTables: ["Zoom Meetings", "Enrollments", "XP Events"],
      requiredFields: ["attendance link / Create XP Events trigger", "XP Events.Source Key"],
      setup: [
        "DEV Zoom Meeting id (env DEV_ZOOM_MEETING_ID)",
        "Enrollment marked attended",
        "101 ON",
        "No recording credit for same meeting+enrollment",
      ],
      writeOperations: [
        "none by default — operator links attendance + Create XP",
        "optional: no shared Zoom Meeting create (never delete shared meetings)",
      ],
      expectedAutomation: ["101"],
      expectedOutputs: ["ZOOM_ATTEND_BASE|meeting|enr count=1"],
      cleanup: ["Clear Create XP trigger; do not delete shared Zoom Meeting"],
      rollback: ["Soft-void XP only with Mike approval"],
      blockers: ["Zoom Meeting id", "attendance UI/link", "Mike DEV auth"],
    },
    async plan({ enrollmentId, meetingId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      const meeting = meetingId || process.env.DEV_ZOOM_MEETING_ID || ids.zoom_meeting;
      return {
        preTestState: {
          enrollmentId: enr,
          zoomMeetingId: meeting,
          require: [
            "Zoom Meeting exists in DEV",
            "Enrollment attendance linked",
            "101 ON",
            "No ZOOM_RECORDING for same meeting+enrollment before live award",
          ],
        },
        writes: [],
        reads: [{ table: "XP Events", purpose: "ZOOM_ATTEND_BASE|meeting|enr" }],
        operatorAction:
          "Link enrollment attendance on Zoom Meeting; trigger Create XP Events (101). CLI does not delete shared meetings.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot attendance + observe 101 ZOOM_ATTEND_BASE create (no shared meeting writes).",
          "No CLI writes to shared Zoom Meetings. Operator ran 101; record Source Key in evidence.",
        ),
        automationEvidence: "101 — ZOOM_ATTEND_BASE|{meeting}|{enr} once.",
        recordsCreated: [],
        result: resultCode(client),
      };
    },
  },

  J4: {
    id: "J4",
    title: "Zoom recording credit from quiz",
    fixture: "zoom_recording",
    automations: ["117a"],
    expectedResult: "One XP Event ZOOM_RECORDING|{meetingId}|{enrollmentId}; blocked if live exists",
    spec: {
      purpose: "Recording quiz Satisfactory awards ZOOM_RECORDING XP once",
      requiredTables: ["Homework Completions", "Zoom Meetings", "XP Events", "Config"],
      requiredFields: [
        "Homework Completions.Satisfactory?",
        "Homework Completions.Zoom Meeting",
        "XP Events.Source Key",
      ],
      setup: [
        "C-025 schema + 117a installed in DEV",
        "Zoom Meeting id",
        "No live ZOOM_ATTEND_BASE for same meeting+enrollment",
        "117a ON in DEV",
      ],
      writeOperations: ["create Homework Completions (Satisfactory + Zoom Meeting + Enrollment)"],
      expectedAutomation: ["117a"],
      expectedOutputs: ["ZOOM_RECORDING|meeting|enr once", "Config % of live"],
      cleanup: ["Delete owned Homework Completion; leave 117a OFF if Mike requests"],
      rollback: ["Delete owned completion; soft-void recording XP if conflict"],
      blockers: ["C-025 DEV install", "117a ON", "Mike DEV auth", "never PROD 117a"],
    },
    async plan({ enrollmentId, meetingId }) {
      const ids = loadIds();
      const enr = enrollmentId || ids.enrollment;
      const meeting = meetingId || process.env.DEV_ZOOM_MEETING_ID || ids.zoom_meeting;
      return {
        preTestState: {
          enrollmentId: enr,
          zoomMeetingId: meeting,
          require: [
            "C-025 DEV install complete",
            "117a ON in DEV only",
            "No live ZOOM_ATTEND_BASE for same meeting+enrollment",
          ],
          forbid: ["PROD 117a", "PROD Make webhook"],
        },
        writes: [
          {
            table: "Homework Completions",
            kind: "create",
            fields: {
              Enrollment: [enr],
              "Zoom Meeting": [meeting],
              "Satisfactory?": true,
            },
          },
        ],
        reads: [{ table: "XP Events", purpose: "ZOOM_RECORDING|meeting|enr" }],
      };
    },
    async execute({ client, plan, state }) {
      const { state: next, created } = await applyPlanWrites(client, plan, state);
      return {
        state: next,
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would create Satisfactory Homework Completion with Zoom Meeting for 117a.",
          "Recording-quiz completion created. Confirm ZOOM_RECORDING|meeting|enr once.",
        ),
        automationEvidence: "117a — statusOut/actionOut + ZOOM_RECORDING Source Key.",
        recordsCreated: created,
        result: resultCode(client),
      };
    },
  },

  J5: {
    id: "J5",
    title: "Zoom recording credit rerun",
    fixture: "zoom_recording",
    automations: ["117a"],
    expectedResult: "skipped_already_awarded; no second ZOOM_RECORDING Event",
    spec: {
      purpose: "117a idempotent rerun",
      requiredTables: ["XP Events", "Homework Completions"],
      requiredFields: ["Source Key"],
      setup: ["J4 already awarded"],
      writeOperations: ["none (operator rerun 117a)"],
      expectedAutomation: ["117a"],
      expectedOutputs: ["actionOut=skipped_already_awarded", "Event count delta 0"],
      cleanup: ["none owned"],
      rollback: ["n/a"],
      blockers: ["Prior J4", "117a in DEV"],
    },
    async plan({ enrollmentId, meetingId }) {
      const ids = loadIds();
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          zoomMeetingId: meetingId || process.env.DEV_ZOOM_MEETING_ID || ids.zoom_meeting,
          require: ["J4 awarded", "Re-run 117a only"],
        },
        writes: [],
        reads: [{ table: "XP Events", purpose: "ZOOM_RECORDING count unchanged" }],
        operatorAction: "Re-run 117a on the same Homework Completion.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would re-run 117a and expect skipped_already_awarded.",
          "No CLI writes. Operator confirmed skipped_already_awarded in evidence.",
        ),
        automationEvidence: "117a rerun — skipped_already_awarded; Event count delta 0.",
        recordsCreated: [],
        result: resultCode(client),
      };
    },
  },

  L1: {
    id: "L1",
    title: "XP Source Key idempotency battery",
    fixture: "duplicate_prevention",
    automations: ["010", "065", "114", "054", "101"],
    expectedResult: "XP Event counts unchanged after listed reruns",
    spec: {
      purpose: "Cross-cutting XP Source Key idempotency",
      requiredTables: ["XP Events"],
      requiredFields: ["Source Key"],
      setup: ["Prior awards from B1/C4/D3/E3/J1 (as available)"],
      writeOperations: ["none — snapshot counts; operator reruns automations"],
      expectedAutomation: ["010", "065", "114", "054", "101"],
      expectedOutputs: ["per-key counts unchanged"],
      cleanup: ["none owned"],
      rollback: ["n/a"],
      blockers: ["Prior XP rows exist", "Mike DEV auth for reruns"],
    },
    async plan({ enrollmentId }) {
      const ids = loadIds();
      const fix = loadFixture("duplicate_prevention");
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          sourceKeyPatterns: fix.source_keys_battery,
          require: ["Snapshot XP counts by Source Key before reruns"],
        },
        writes: [],
        reads: [{ table: "XP Events", purpose: "count by Source Key before/after" }],
        operatorAction: "Re-run 010, 065, 114, 054, 101 as applicable; record counts in evidence.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot XP Source Key counts and instruct automation reruns.",
          "No CLI writes. Operator completed L1 battery; paste before/after counts in evidence.",
        ),
        automationEvidence: "L1 battery — Event counts unchanged for each Source Key.",
        recordsCreated: [],
        result: resultCode(client),
      };
    },
  },

  L2: {
    id: "L2",
    title: "Unlock Source Key idempotency battery",
    fixture: "duplicate_prevention",
    automations: ["058", "066", "059"],
    expectedResult: "Unlock/XP counts unchanged after listed reruns",
    spec: {
      purpose: "Cross-cutting unlock Source Key idempotency",
      requiredTables: ["Achievement Unlocks", "XP Events"],
      requiredFields: ["Source Key / Milestone Source Key"],
      setup: ["Prior unlocks from G3/F1/F2 (+ 059 XP if present)"],
      writeOperations: ["none — snapshot; operator reruns"],
      expectedAutomation: ["058", "066", "059"],
      expectedOutputs: ["unlock/XP counts unchanged"],
      cleanup: ["none owned"],
      rollback: ["n/a"],
      blockers: ["Prior unlocks", "Mike DEV auth for reruns"],
    },
    async plan({ enrollmentId }) {
      const ids = loadIds();
      return {
        preTestState: {
          enrollmentId: enrollmentId || ids.enrollment,
          require: ["Snapshot unlock Source Keys before reruns"],
        },
        writes: [],
        reads: [
          { table: "Achievement Unlocks", purpose: "count by Source Key" },
          { table: "XP Events", purpose: "unlock-linked XP counts" },
        ],
        operatorAction: "Re-run 058, 066, 059 as applicable; record counts in evidence.",
      };
    },
    async execute({ client, plan, state }) {
      return {
        state: { ...state, preTestState: plan.preTestState },
        actualResult: dryOrLive(
          client,
          "DRY-RUN: would snapshot unlock Source Keys and instruct 058/066/059 reruns.",
          "No CLI writes. Operator completed L2 battery; paste before/after counts in evidence.",
        ),
        automationEvidence: "L2 battery — unlock/XP counts unchanged.",
        recordsCreated: [],
        result: resultCode(client),
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

function listScenarioSpecs() {
  return SUPPORTED_LIVE_TESTS.map((id) => {
    const s = SCENARIOS[id];
    return {
      id,
      title: s.title,
      automations: s.automations,
      fixture: s.fixture,
      expectedResult: s.expectedResult,
      spec: s.spec,
    };
  });
}

module.exports = {
  SCENARIOS,
  getScenario,
  listScenarioSpecs,
  loadFixture,
  loadIds,
  applyPlanWrites,
};
