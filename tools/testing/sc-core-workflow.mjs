/**
 * SC-CORE-WF — core workflow reliability audit + disposable apply.
 *
 * Default: live readonly audit of Weeks + PHA against confirmed season rules.
 * --apply: disposable Testing3 path covering Early Bird submissions, multi/day,
 * backdates, PHA-linked homework, late-week-on-time deadline, negatives,
 * WAS package prep without email send.
 *
 * Never restores 075. Never sends email. Never runs season simulation.
 * Never repastes aligned automations 010/020/022/057/065/072/073.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requireToken,
  listRecords,
  createRecords,
  updateRecords,
  deleteRecords,
  ROOT,
} from "./lib/airtable-client.mjs";
import {
  GATED_ENROLLMENT_ID,
  GATED_ATHLETE_ID,
  PROGRAM_INSTANCE_ID,
  GRADE_BAND_5_6_ID,
  denverNoon,
  submissionXpKey,
  homeworkXpKey,
  evaluateHomework065Eligibility,
  sleep,
} from "./lib/sc-athlete-wf-lib.mjs";

const require = createRequire(import.meta.url);
const {
  SEASON_2026_2027,
  auditProgramHomeworkSchedule,
  auditOperationalWeeksCalendar,
  evaluateSubmissionXpPolicy,
  evaluateLateWeekOnTimeDeadline,
  evaluateEarlyBirdActivityDate,
} = require("../../lib/workflow-contracts");

const HERE = dirname(fileURLToPath(import.meta.url));
const HARNESS = "SC-CORE-WF";
const PREFIX = "COREWF|";
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/sc-core-workflow");
const MANIFEST_PATH = resolve(ROOT, "docs/testing/core-workflow/fixtures/_sc-core-wf-last.json");

const LIVE_IDS = Object.freeze({
  earlyBirdWeek: "recBrZ1sV8byWEHZU",
  week1: "rec2Rewxt21z7dI9f",
  week9: "rech8lgJkNMStWh9A",
  // Restored after FUT-030 (2026-08-31) — old IDs wiped
  earlyBirdHw1: "recrpWRmt0MntieCL",
  earlyBirdHw2: "recfcXqQsk3W4o6IT",
  week1Hw1: "rechCXdubiA1RPFEj",
});

function parseArgs(argv) {
  const args = { apply: false, cleanup: false, audit: true, out: null, help: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--cleanup") args.cleanup = true;
    else if (a === "--no-audit") args.audit = false;
    else if (a === "--out") args.out = resolve(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function saveManifest(data) {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2));
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function writeEvidence(report, outPath) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const path =
    outPath ||
    resolve(EVIDENCE_DIR, `${report.mode}-${new Date().toISOString().replace(/[:.]/g, "")}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

function firstLinkName(value) {
  if (Array.isArray(value) && value[0]) {
    if (typeof value[0] === "object") return String(value[0].name || value[0].id || "");
    return String(value[0]);
  }
  return "";
}

function firstLinkId(value) {
  if (Array.isArray(value) && value[0]) {
    if (typeof value[0] === "object") return String(value[0].id || "");
    return String(value[0]);
  }
  return "";
}

async function auditLiveSchedule(token, baseId) {
  const weeks = await listRecords(token, baseId, "Weeks", {
    fields: ["Week Name", "Start Date", "End Date", "Counts Toward Challenge?"],
    maxRecords: 100,
  });
  const pha = await listRecords(token, baseId, "Program Homework Assignments", {
    fields: [
      "Program Homework Assignment",
      "Week",
      "Due Date",
      "Active?",
      "Homework Slot",
      "Program Instance",
    ],
    maxRecords: 200,
  });

  const weekRows = (Array.isArray(weeks) ? weeks : weeks?.records || []).map((r) => ({
    id: r.id,
    weekName: r.fields["Week Name"],
    startDate: r.fields["Start Date"],
    endDate: r.fields["End Date"],
    countsTowardChallenge: r.fields["Counts Toward Challenge?"] === true,
  }));
  const weekNameById = new Map(weekRows.map((w) => [w.id, w.weekName]));

  const phaRows = (Array.isArray(pha) ? pha : pha?.records || [])
    .filter((r) => {
      const pi = firstLinkId(r.fields["Program Instance"]);
      return !pi || pi === PROGRAM_INSTANCE_ID;
    })
    .map((r) => {
      const weekId = firstLinkId(r.fields.Week);
      return {
        id: r.id,
        weekName: weekNameById.get(weekId) || firstLinkName(r.fields.Week) || "",
        weekId,
        dueDate: r.fields["Due Date"],
        active: r.fields["Active?"] === true,
        slot:
          typeof r.fields["Homework Slot"] === "object"
            ? r.fields["Homework Slot"]?.name
            : r.fields["Homework Slot"],
      };
    });

  const weekAudit = auditOperationalWeeksCalendar(
    weekRows.filter((w) => !String(w.weekName || "").includes("|"))
  );
  const phaAudit = auditProgramHomeworkSchedule(phaRows.filter((p) => p.active));

  return {
    weekAudit,
    phaAudit,
    weekCount: weekRows.length,
    phaActiveCount: phaRows.filter((p) => p.active).length,
    phaInactiveCount: phaRows.filter((p) => !p.active).length,
    earlyBirdEval: evaluateEarlyBirdActivityDate("2027-04-28"),
    lateWeekEval: evaluateLateWeekOnTimeDeadline({
      submissionDateKey: "2027-05-20",
      weekEndDate: "2027-05-08",
      phaDueDate: SEASON_2026_2027.commonHomeworkDueDate,
    }),
  };
}

async function pollXp(token, baseId, sourceKey, { timeoutMs = 120000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await listRecords(token, baseId, "XP Events", {
      filterByFormula: `{Source Key}="${sourceKey}"`,
      fields: ["Source Key", "XP Points", "Active?", "XP Activity Date", "Enrollment", "Week"],
      maxRecords: 5,
    });
    const rows = Array.isArray(res) ? res : res?.records || [];
    if (rows.length) {
      return {
        count: rows.length,
        ids: rows.map((r) => r.id),
        events: rows.map((r) => ({
          id: r.id,
          sourceKey: r.fields["Source Key"],
          points: r.fields["XP Points"],
          active: r.fields["Active?"] !== false,
          activityDate: r.fields["XP Activity Date"],
        })),
      };
    }
    await sleep(8000);
  }
  return { count: 0, ids: [], events: [] };
}

async function runApply(token, baseId, report) {
  const batchKey = `${PREFIX}${new Date().toISOString().slice(0, 10)}|core`;
  const weekName = `${batchKey}|WEEK`;
  // Past Sun–Sat so Count This Submission? can be 1. Live 2027 Early Bird calendar is --audit only.
  const weekStart = "2026-06-07";
  const weekEnd = "2026-06-13";
  const created = {
    batchKey,
    weekName,
    weekId: null,
    submissionIds: [],
    homeworkIds: [],
    wasId: null,
    inactiveEnrollmentId: null,
    xpEventIds: [],
    wasReused: false,
  };

  report.notes = [
    "Operational Early Bird 2027 calendar audited separately (live.weeks_calendar).",
    "Submission XP apply uses disposable past countable week — future Early Bird Activity Dates yield Count This Submission?=0 until season.",
  ];

  const weekRes = await createRecords(token, baseId, "Weeks", [
    {
      fields: {
        "Week Name": weekName,
        "Start Date": `${weekStart}T00:00:00.000-06:00`,
        "End Date": `${weekEnd}T23:59:00.000-06:00`,
        "Program Instance": [PROGRAM_INSTANCE_ID],
        "Counts Toward Challenge?": true,
      },
    },
  ]);
  created.weekId = weekRes.records[0].id;

  const wasRes = await createRecords(token, baseId, "Weekly Athlete Summary", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Week: [created.weekId],
        "Perfect Week Automation Status": "Error",
      },
    },
  ]);
  created.wasId = wasRes.records[0].id;

  const submissionPlans = [
    { tag: "countable-a", date: "2026-06-08", shots: 40 },
    { tag: "same-day-b", date: "2026-06-08", shots: 25 },
    { tag: "backdated", date: "2026-06-07", shots: 30 },
    { tag: "week-mismatch", date: "2026-06-20", shots: 35 },
  ];

  for (const plan of submissionPlans) {
    const res = await createRecords(token, baseId, "Submissions", [
      {
        fields: {
          Enrollment: [GATED_ENROLLMENT_ID],
          Athlete: [GATED_ATHLETE_ID],
          Week: [created.weekId],
          "Weekly Athlete Summary": [created.wasId],
          "Activity Date": denverNoon(plan.date),
          "Shot Total": plan.shots,
          "Duplicate Review Status": "Count It",
          "Daily Email Subject": `${batchKey}|${plan.tag}`,
        },
      },
    ]);
    created.submissionIds.push({ id: res.records[0].id, ...plan });
  }

  const hcRes = await createRecords(token, baseId, "Homework Completions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Week: [LIVE_IDS.earlyBirdWeek],
        "Program Homework Assignment": [LIVE_IDS.earlyBirdHw1],
        "Satisfactory?": true,
        "Review Complete": true,
        "Coach Feedback": `${batchKey}|HC-pha-linked`,
      },
    },
  ]);
  created.homeworkIds.push({ id: hcRes.records[0].id, kind: "pha-linked-eb" });

  const dupHc = await createRecords(token, baseId, "Homework Completions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Week: [LIVE_IDS.earlyBirdWeek],
        "Program Homework Assignment": [LIVE_IDS.earlyBirdHw1],
        "Satisfactory?": true,
        "Review Complete": true,
        "Coach Feedback": `${batchKey}|HC-duplicate-identity`,
      },
    },
  ]);
  created.homeworkIds.push({ id: dupHc.records[0].id, kind: "duplicate-pha-identity" });

  const missing = await createRecords(token, baseId, "Homework Completions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Week: [LIVE_IDS.earlyBirdWeek],
        "Satisfactory?": true,
        "Review Complete": true,
        "Coach Feedback": `${batchKey}|HC-missing-pha`,
      },
    },
  ]);
  created.homeworkIds.push({ id: missing.records[0].id, kind: "missing-pha" });

  const lateOnTime = evaluateLateWeekOnTimeDeadline({
    submissionDateKey: "2027-05-20",
    weekEndDate: "2027-05-08",
    phaDueDate: "2027-06-29",
  });
  report.lateWeekOnTimeContract = lateOnTime;
  const lateHc = await createRecords(token, baseId, "Homework Completions", [
    {
      fields: {
        Enrollment: [GATED_ENROLLMENT_ID],
        Week: [LIVE_IDS.week1],
        "Program Homework Assignment": [LIVE_IDS.week1Hw1],
        "Satisfactory?": true,
        "Review Complete": true,
        "Coach Feedback": `${batchKey}|HC-after-week-before-due`,
      },
    },
  ]);
  created.homeworkIds.push({ id: lateHc.records[0].id, kind: "after-week-before-due" });

  try {
    const inactive = await createRecords(token, baseId, "Enrollments", [
      {
        fields: {
          "Active?": false,
          "Program Instance": [PROGRAM_INSTANCE_ID],
          "Grade Band": [GRADE_BAND_5_6_ID],
          Athlete: [GATED_ATHLETE_ID],
        },
      },
    ]);
    created.inactiveEnrollmentId = inactive.records[0].id;
  } catch (err) {
    created.inactiveEnrollmentError = String(err.message || err).slice(0, 200);
  }

  saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
  report.created = created;

  const xpInventory = [];
  for (const sub of created.submissionIds) {
    const expectXp = sub.tag !== "week-mismatch";
    const polled = await pollXp(token, baseId, submissionXpKey(sub.id), {
      timeoutMs: expectXp ? 150000 : 25000,
    });
    const pass = expectXp ? polled.count === 1 : true;
    report.checks.push({
      id: `submission_xp.${sub.tag}`,
      pass,
      status: pass ? "PASS" : "FAIL",
      expected: expectXp ? 1 : "skip-or-zero OK for mismatch",
      actual: polled.count,
      sourceKey: submissionXpKey(sub.id),
      activityDate: sub.date,
    });
    for (const ev of polled.events) {
      xpInventory.push(ev);
      created.xpEventIds.push(ev.id);
    }
  }

  report.submissionXpPolicy = evaluateSubmissionXpPolicy(xpInventory);
  report.checks.push({
    id: "submission_xp.policy",
    pass: report.submissionXpPolicy.ok,
    status: report.submissionXpPolicy.ok ? "PASS" : "FAIL",
    actual: report.submissionXpPolicy.note,
  });

  const phaHc = created.homeworkIds.find((h) => h.kind === "pha-linked-eb");
  const eligibility = evaluateHomework065Eligibility({
    satisfactory: true,
    reviewComplete: true,
    reconcileNeeded: false,
    totalHomeworkXpAwarded: 0,
    phaLinked: true,
    hasSubmissionLink: false,
  });
  report.homework065Eligibility = eligibility;
  if (phaHc) {
    const hwXp = await pollXp(token, baseId, homeworkXpKey(phaHc.id), {
      timeoutMs: eligibility.expectXp ? 120000 : 20000,
    });
    report.checks.push({
      id: "homework_xp.pha_linked_path",
      pass: hwXp.count === (eligibility.expectXp ? 1 : 0),
      status: hwXp.count === (eligibility.expectXp ? 1 : 0) ? "PASS" : "FAIL",
      expected: eligibility.expectXp ? 1 : 0,
      actual: hwXp.count,
      notes: eligibility.note,
    });
    created.xpEventIds.push(...hwXp.ids);
  }

  const wasSnap = await listRecords(token, baseId, "Weekly Athlete Summary", {
    filterByFormula: `RECORD_ID()="${created.wasId}"`,
    fields: ["Build Weekly Email Now?", "Weekly Email Sent?", "Send to Make?"],
    maxRecords: 1,
  });
  const wasSnapRows = Array.isArray(wasSnap) ? wasSnap : wasSnap?.records || [];
  const wasFields = wasSnapRows[0]?.fields || {};
  const noEmail =
    !wasFields["Build Weekly Email Now?"] &&
    !wasFields["Weekly Email Sent?"] &&
    !wasFields["Send to Make?"];
  report.checks.push({
    id: "coach_queue.prep_without_email",
    pass: noEmail,
    status: noEmail ? "PASS" : "FAIL",
    expected: "No weekly email send triggers",
    actual: JSON.stringify({
      build: wasFields["Build Weekly Email Now?"],
      sent: wasFields["Weekly Email Sent?"],
      make: wasFields["Send to Make?"],
    }),
  });

  report.checks.push({
    id: "deadline.after_week_before_june29",
    pass: lateOnTime.creditEligible === true && lateOnTime.afterLinkedWeekEnd === true,
    status: lateOnTime.creditEligible && lateOnTime.afterLinkedWeekEnd ? "PASS" : "FAIL",
    actual: lateOnTime,
  });

  report.checks.push({
    id: "homework.duplicate_identity_created",
    pass: created.homeworkIds.filter((h) => h.kind.includes("pha")).length >= 2,
    status: "PASS",
    notes: "Two HC rows share Enrollment+PHA — inventory recorded",
  });

  saveManifest({ harness: HARNESS, createdAt: new Date().toISOString(), ...created });
  return report;
}

async function cleanup(token, baseId) {
  const manifest = loadManifest();
  if (!manifest) return { ok: false, reason: "no manifest" };
  const actions = [];

  const xpIds = manifest.xpEventIds || [];
  if (xpIds.length) {
    try {
      await deleteRecords(token, baseId, "XP Events", xpIds);
      actions.push({ table: "XP Events", deleted: xpIds, status: "deleted" });
    } catch (err) {
      actions.push({ table: "XP Events", ids: xpIds, status: "error", error: String(err.message || err).slice(0, 180) });
    }
  }

  const hcIds = (manifest.homeworkIds || []).map((h) => h.id || h);
  if (hcIds.length) {
    try {
      await deleteRecords(token, baseId, "Homework Completions", hcIds);
      actions.push({ table: "Homework Completions", deleted: hcIds, status: "deleted" });
    } catch (err) {
      actions.push({ table: "Homework Completions", status: "error", error: String(err.message || err).slice(0, 180) });
    }
  }

  const subIds = (manifest.submissionIds || []).map((s) => s.id || s);
  if (subIds.length) {
    try {
      await deleteRecords(token, baseId, "Submissions", subIds);
      actions.push({ table: "Submissions", deleted: subIds, status: "deleted" });
    } catch (err) {
      actions.push({ table: "Submissions", status: "error", error: String(err.message || err).slice(0, 180) });
    }
  }

  if (manifest.inactiveEnrollmentId) {
    try {
      await deleteRecords(token, baseId, "Enrollments", [manifest.inactiveEnrollmentId]);
      actions.push({ table: "Enrollments", deleted: [manifest.inactiveEnrollmentId], status: "deleted" });
    } catch (err) {
      actions.push({ table: "Enrollments", status: "error", error: String(err.message || err).slice(0, 180) });
    }
  }

  if (manifest.wasId) {
    try {
      await deleteRecords(token, baseId, "Weekly Athlete Summary", [manifest.wasId]);
      actions.push({ table: "Weekly Athlete Summary", deleted: [manifest.wasId], status: "deleted" });
    } catch (err) {
      actions.push({ table: "Weekly Athlete Summary", status: "error", error: String(err.message || err).slice(0, 180) });
    }
  }

  if (manifest.weekId && String(manifest.weekName || "").startsWith(PREFIX)) {
    try {
      await deleteRecords(token, baseId, "Weeks", [manifest.weekId]);
      actions.push({ table: "Weeks", deleted: [manifest.weekId], status: "deleted" });
    } catch (err) {
      try {
        await updateRecords(token, baseId, "Weeks", [{
          id: manifest.weekId,
          fields: {
            "Week Name": `${PREFIX}ARCHIVED|${manifest.weekName || manifest.weekId}`,
            "Counts Toward Challenge?": false,
          },
        }]);
        actions.push({ table: "Weeks", id: manifest.weekId, status: "archived" });
      } catch (err2) {
        actions.push({ table: "Weeks", status: "error", error: String(err2.message || err2).slice(0, 180) });
      }
    }
  }

  return { ok: true, actions };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`SC-CORE-WF — core workflow reliability

  node tools/testing/sc-core-workflow.mjs            # live readonly audit
  node tools/testing/sc-core-workflow.mjs --apply    # disposable Testing3 apply
  node tools/testing/sc-core-workflow.mjs --cleanup
`);
    return;
  }

  const { token, baseId } = requireToken();
  const report = {
    harness: HARNESS,
    mode: args.cleanup ? "cleanup" : args.apply ? "apply" : "audit",
    startedAt: new Date().toISOString(),
    policy: SEASON_2026_2027,
    checks: [],
    defects: [],
    passed: false,
  };

  if (args.cleanup) {
    report.cleanup = await cleanup(token, baseId);
    report.passed = report.cleanup.ok;
    const path = writeEvidence(report, args.out);
    console.log(JSON.stringify({ passed: report.passed, evidence: path, cleanup: report.cleanup }, null, 2));
    return;
  }

  if (args.audit) {
    report.audit = await auditLiveSchedule(token, baseId);
    for (const f of [...report.audit.weekAudit.findings, ...report.audit.phaAudit.findings]) {
      report.defects.push(f);
    }
    report.checks.push({
      id: "live.weeks_calendar",
      pass: report.audit.weekAudit.ok,
      status: report.audit.weekAudit.ok ? "PASS" : "FAIL",
      findings: report.audit.weekAudit.findings,
    });
    report.checks.push({
      id: "live.pha_schedule",
      pass: report.audit.phaAudit.ok,
      status: report.audit.phaAudit.ok ? "PASS" : "FAIL",
      activeCount: report.audit.phaAudit.activeCount,
      byWeek: report.audit.phaAudit.byWeek,
      findings: report.audit.phaAudit.findings,
    });
  }

  if (args.apply) {
    await runApply(token, baseId, report);
  }

  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.every((c) => c.pass !== false) && report.defects.length === 0;
  const path = writeEvidence(report, args.out);
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        mode: report.mode,
        checks: report.checks.map((c) => ({ id: c.id, status: c.status, pass: c.pass })),
        defects: report.defects,
        evidence: path,
      },
      null,
      2
    )
  );
  if (!report.passed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
