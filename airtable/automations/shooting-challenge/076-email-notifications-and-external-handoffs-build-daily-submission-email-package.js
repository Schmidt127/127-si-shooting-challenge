/*
GitHub header
Automation: 076 - Daily Submission Communications Hub Handoff
System: 127 SI Shooting Challenge
Version: v8.2
Date Written: 2026-05-29
Last Updated: 2026-08-12

PURPOSE
- Validate a fully processed Submission and create exactly one Ready Email Handoff Queue row.
- Hand off template data to Automation 079 / Communications Hub.

IMPORTANT DESIGN RULES
- Hub owns subject, HTML, plain text, branding, validation, delivery, and Delivery proof.
- This script never calls Hub, Make, Gmail, or writes legacy daily email fields.
- One Submission maps to `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}`.
- Active XP only; missing Submission XP is represented as null plus pending status.
- Program Instance, Enrollment, Week, Weekly Athlete Summary, and PHA ownership are fail-closed.
- 077 is retired as a pending retirement candidate and is never armed by this script.

INPUT
- `recordId` (required Airtable Submission record ID)

OUTPUTS
- `statusOut`: success | skipped | error
- `actionOut`: created_handoff | existing_handoff | needs_review | skipped_not_ready | error
- `queueRecordId`, `handoffKey`, `errorOut`, `debugStep`

TRIGGER
- Automation 031 is the sole upstream owner that checks `Build Daily Email Now?`,
  only after the 023 → 005 → 007 → 010 → 031 chain has settled.
- `Count This Submission?` and `Submission Stat Mode` remain supporting guards,
  and 076 fail-closes unless count evaluates checked/1 and the mode is exactly
  `Simple Total` or `Detailed Shooting` after trim/case normalization.
- Clear `Build Daily Email Now?` after an existing or newly created handoff so
  a successful replay cannot retrigger the source signal.

AUTOMATION NAME
- 076 - Daily Submission Communications Hub Handoff
FOLDER
- 07 - Email, Notifications, and External Handoffs
*/

// @ts-nocheck
const SCRIPT = { scriptName: "076 - Daily Submission Communications Hub Handoff", version: "v8.2", versionDate: "2026-08-12", originalWrittenDate: "2026-05-29", lastUpdated: "2026-08-12", folder: "07 - Email, Notifications, and External Handoffs", automationName: "076 - Daily Submission Communications Hub Handoff" };
const CONFIG = {
  tables: { sub: "Submissions", enr: "Enrollments", was: "Weekly Athlete Summary", week: "Weeks", pi: "Program Instance - Synced", xp: "XP Events", hc: "Homework Completions", pha: "Program Homework Assignments", curr: "Homework Library", queue: "Email Handoff Queue" },
  statuses: { draft: "Draft", ready: "Ready", needsReview: "Needs Review" },
  fields: {
    sub: { enrollment: "Enrollment", week: "Week", was: "Weekly Athlete Summary", activity: "Activity Date", build: "Build Daily Email Now?", count: "Count This Submission?", mode: "Submission Stat Mode", shots: "Total Shots Counted", makes: "Total Makes Counted", hw1: "HW Sub 1", hw2: "HW Sub 2", video: "Video Upload", hcs: "Homework Completions" },
    enr: { active: "Active?", program: "Program Instance", grade: "Grade Band", parent: "Parent Email - Cleaned", parentFallback: "Parent Email", athlete: "Athlete Email - Cleaned", athleteFallback: "Athlete Email", name: "Full Athlete Name", first: "Athlete First Name", streak: "Current Shooting Streak", currentLevel: "Current Level", nextLevel: "Next Level" },
    was: { enrollment: "Enrollment", week: "Week", hcs: "Homework Completions Link", xps: "XP Events", shots: "Total Shots This Week", goal: "Weekly Goal Shots Target", weekName: "Week - Display" },
    week: { name: "Week Name", start: "Start Date", end: "End Date", program: "Program Instance" },
    pi: { name: "Name - Program Instance" },
    xp: { active: "Active?", points: "XP Points", enrollment: "Enrollment", week: "Week", submission: "Submission" },
    pha: { homework: "Homework Assignment", program: "Program Instance", week: "Week", grade: "Grade Band", slot: "Homework Slot", active: "Active?" },
    curr: { title: "Assignment Title", full: "Assignment Full Name", week: "Week", grade: "Grade Band", active: "Active?", published: "Published?", order: "Order" },
    queue: { key: "Handoff Key", status: "Status", sourceTable: "Source Table", eventType: "Event Type", payload: "Payload JSON", attempts: "Attempt Count", pi: "Program Instance Record ID", source: "Source Record ID", enrollment: "Enrollment Record ID", recipients: "Recipients JSON", template: "Template Key", testMode: "Test Mode?" },
  },
};
const TZ = "America/Denver";
const table = (name) => base.getTable(name);
const exists = (t, name) => { try { t.getField(name); return true; } catch { return false; } };
const raw = (r, t, name) => r && exists(t, name) ? r.getCellValue(name) : null;
const text = (r, t, name) => r && exists(t, name) ? String(r.getCellValueAsString(name) || "").trim() : "";
const ids = (r, t, name) => Array.isArray(raw(r, t, name)) ? raw(r, t, name).map((v) => v?.id).filter(Boolean) : [];
const num = (r, t, name, fallback = 0) => { const v = raw(r, t, name); const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,%]/g, "").replace(/,/g, "").trim()); return Number.isFinite(n) ? n : fallback; };
const nonnegativeInteger = (r, t, name) => { const v = raw(r, t, name); const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, "").trim()); if (v === null || v === undefined || v === "" || !Number.isInteger(n) || n < 0) throw new Error(`${name} must be a settled nonnegative integer.`); return n; };
const bool = (r, t, name) => { const v = raw(r, t, name); if (v === true || v === 1) return true; if (v === false || v === 0) return false; return ["true", "yes", "checked", "1", "counted", "count"].includes(text(r, t, name).toLowerCase()); };
const checkedReadiness = (r, t, name) => { const v = raw(r, t, name); if (v === true || v === 1) return true; return ["true", "yes", "checked", "1"].includes(text(r, t, name).toLowerCase()); };
const normalizedStatMode = (r, t, name) => text(r, t, name).toLowerCase();
const one = (values, label) => { if (values.length !== 1) throw new Error(`${label} must have exactly one link; found ${values.length}.`); return values[0]; };
const same = (left, right) => left.length === right.length && left.every((value) => right.includes(value));
const first = (...values) => values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
const cleanEmail = (value) => String(value || "").trim().toLowerCase();
const dateText = (value) => { const date = value instanceof Date ? value : new Date(value); return !value || Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" }).format(date); };
const pct = (value, target) => Number(target) > 0 ? Math.round((Number(value) / Number(target)) * 100) : 0;
const setOutput = (name, value) => { try { output.set(name, value); } catch {} };
const debug = (value) => setOutput("debugStep", value);
const selectValue = (t, name, value) => { const field = t.getField(name); if (field.type !== "singleSelect") return value; const choice = field.options.choices.find((item) => item.name.toLowerCase() === value.toLowerCase()); if (!choice) throw new Error(`Missing option ${value} on ${t.name}.${name}`); return { id: choice.id }; };
const formula = (field, value) => `{${field}}='${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const load = (t, fields) => t.selectRecordsAsync({ fields: fields.filter((name) => exists(t, name)) });
const slot = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const queueFields = (queueT, values) => Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueT, name)));
const stableJson = (value) => Array.isArray(value) ? `[${value.map(stableJson).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}` : JSON.stringify(value);
const samePayload = (left, right) => { try { return stableJson(JSON.parse(left || "{}")) === stableJson(right); } catch { return false; } };
const clearBuildSignal = async (submissionTable, submissionId) => { if (exists(submissionTable, CONFIG.fields.sub.build) && submissionTable.getField(CONFIG.fields.sub.build).type === "checkbox") await submissionTable.updateRecordAsync(submissionId, { [CONFIG.fields.sub.build]: false }); };
const markQueueNeedsReview = async (queueTable, rows) => { for (const row of rows) if (exists(queueTable, CONFIG.fields.queue.status)) await queueTable.updateRecordAsync(row.id, { [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview) }); };

async function main() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) throw new Error("recordId must be a valid Airtable record ID.");
  const subT = table(CONFIG.tables.sub), enrT = table(CONFIG.tables.enr), wasT = table(CONFIG.tables.was), weekT = table(CONFIG.tables.week), piT = table(CONFIG.tables.pi), xpT = table(CONFIG.tables.xp), phaT = table(CONFIG.tables.pha), currT = table(CONFIG.tables.curr), queueT = table(CONFIG.tables.queue);
  const sub = await subT.selectRecordAsync(recordId);
  if (!sub) throw new Error(`Submission not found: ${recordId}`);
  const handoffKey = `DAILY_SUBMISSION|SUBMISSIONS|${recordId}`;
  debug("01 - Validate Submission readiness");
  if (!exists(subT, CONFIG.fields.sub.build)) throw new Error(`Missing required readiness signal: ${CONFIG.fields.sub.build}.`);
  if (!bool(sub, subT, CONFIG.fields.sub.build)) return setOutput("statusOut", "skipped"), setOutput("actionOut", "skipped_not_ready");
  if (!exists(subT, CONFIG.fields.sub.count) || !checkedReadiness(sub, subT, CONFIG.fields.sub.count)) return setOutput("statusOut", "skipped"), setOutput("actionOut", "skipped_not_ready");
  if (!exists(subT, CONFIG.fields.sub.mode) || !["simple total", "detailed shooting"].includes(normalizedStatMode(sub, subT, CONFIG.fields.sub.mode))) return setOutput("statusOut", "skipped"), setOutput("actionOut", "skipped_not_ready");
  const enrollmentId = one(ids(sub, subT, CONFIG.fields.sub.enrollment), "Submission Enrollment");
  const weekId = one(ids(sub, subT, CONFIG.fields.sub.week), "Submission Week");
  const [enrollment, week] = await Promise.all([enrT.selectRecordAsync(enrollmentId), weekT.selectRecordAsync(weekId)]);
  if (!enrollment || !week) throw new Error("Submission Enrollment/Week not found.");
  if (exists(enrT, CONFIG.fields.enr.active) && !bool(enrollment, enrT, CONFIG.fields.enr.active)) return setOutput("statusOut", "skipped"), setOutput("actionOut", "skipped_inactive_enrollment");
  const programId = one(ids(enrollment, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");
  const gradeId = ids(enrollment, enrT, CONFIG.fields.enr.grade)[0] || "";
  const program = await piT.selectRecordAsync(programId);
  if (!program) throw new Error("Program Instance not found.");
  if (ids(week, weekT, CONFIG.fields.week.program).length && !same(ids(week, weekT, CONFIG.fields.week.program), [programId])) throw new Error("Week Program Instance does not match Enrollment.");
  const wasIds = ids(sub, subT, CONFIG.fields.sub.was);
  if (wasIds.length > 1) throw new Error("Submission links multiple Weekly Athlete Summaries.");
  const was = wasIds.length ? await wasT.selectRecordAsync(wasIds[0]) : null;
  if (was && (!same(ids(was, wasT, CONFIG.fields.was.enrollment), [enrollmentId]) || !same(ids(was, wasT, CONFIG.fields.was.week), [weekId]))) throw new Error("Weekly Athlete Summary is not canonical for Enrollment + Week.");
  debug("02 - Reconcile active XP and weekly summary");
  const xpQuery = await load(xpT, Object.values(CONFIG.fields.xp));
  const activeXp = xpQuery.records.filter((row) => bool(row, xpT, CONFIG.fields.xp.active) && same(ids(row, xpT, CONFIG.fields.xp.enrollment), [enrollmentId]) && same(ids(row, xpT, CONFIG.fields.xp.week), [weekId]));
  const submissionXpRows = activeXp.filter((row) => ids(row, xpT, CONFIG.fields.xp.submission).includes(recordId));
  const submissionXp = submissionXpRows.length ? submissionXpRows.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0) : null;
  const weeklyXp = activeXp.reduce((sum, row) => sum + num(row, xpT, CONFIG.fields.xp.points), 0);
  const weeklyShots = was ? num(was, wasT, CONFIG.fields.was.shots) : 0;
  const weeklyGoal = was ? num(was, wasT, CONFIG.fields.was.goal) : 0;
  debug("03 - Resolve PHA-first homework context");
  const phaQuery = await load(phaT, Object.values(CONFIG.fields.pha));
  const phaRows = phaQuery.records.filter((row) => bool(row, phaT, CONFIG.fields.pha.active) && same(ids(row, phaT, CONFIG.fields.pha.program), [programId]) && same(ids(row, phaT, CONFIG.fields.pha.week), [weekId]) && (!gradeId || same(ids(row, phaT, CONFIG.fields.pha.grade), [gradeId])));
  const homeworkAssignments = phaRows.sort((a, b) => slot(text(a, phaT, CONFIG.fields.pha.slot)).localeCompare(slot(text(b, phaT, CONFIG.fields.pha.slot)))).map((row) => `${slot(text(row, phaT, CONFIG.fields.pha.slot)) || "Homework"}: ${text(row, phaT, CONFIG.fields.pha.homework)}`).filter(Boolean);
  const currQuery = phaRows.length ? null : await load(currT, Object.values(CONFIG.fields.curr));
  const legacyAssignments = currQuery ? currQuery.records.filter((row) => same(ids(row, currT, CONFIG.fields.curr.week), [weekId]) && (!exists(currT, CONFIG.fields.curr.active) || bool(row, currT, CONFIG.fields.curr.active)) && (!gradeId || !ids(row, currT, CONFIG.fields.curr.grade).length || ids(row, currT, CONFIG.fields.curr.grade).includes(gradeId))).sort((a, b) => num(a, currT, CONFIG.fields.curr.order, 9999) - num(b, currT, CONFIG.fields.curr.order, 9999)).slice(0, 2).map((row, index) => `HW${index + 1}: ${first(text(row, currT, CONFIG.fields.curr.title), text(row, currT, CONFIG.fields.curr.full), row.name)}`) : [];
  const assignments = [...homeworkAssignments, ...legacyAssignments];
  const parent = cleanEmail(first(text(enrollment, enrT, CONFIG.fields.enr.parent), text(enrollment, enrT, CONFIG.fields.enr.parentFallback)));
  const athlete = cleanEmail(first(text(enrollment, enrT, CONFIG.fields.enr.athlete), text(enrollment, enrT, CONFIG.fields.enr.athleteFallback)));
  const recipients = [...new Map([[parent, { email: parent, role: "guardian", displayName: text(enrollment, enrT, CONFIG.fields.enr.name) }], [athlete, { email: athlete, role: "athlete", displayName: text(enrollment, enrT, CONFIG.fields.enr.name) }]].filter(([email]) => email).map(([email, value]) => [email, value])).values()];
  if (!recipients.some((recipient) => recipient.role === "guardian")) throw new Error("No usable parent recipient.");
  const payload = {
    athleteName: first(text(enrollment, enrT, CONFIG.fields.enr.name), "Athlete"),
    activityDate: dateText(raw(sub, subT, CONFIG.fields.sub.activity)),
    weekName: first(text(was, wasT, CONFIG.fields.was.weekName), text(week, weekT, CONFIG.fields.week.name)),
    shots: nonnegativeInteger(sub, subT, CONFIG.fields.sub.shots),
    makes: nonnegativeInteger(sub, subT, CONFIG.fields.sub.makes),
    submissionXp, ...(submissionXp === null ? { submissionXpStatus: "Pending / not yet awarded" } : {}),
    weeklyShots, weeklyGoal, weeklyGoalPercentage: pct(weeklyShots, weeklyGoal), weeklyXp,
    currentStreak: num(enrollment, enrT, CONFIG.fields.enr.streak), currentLevel: text(enrollment, enrT, CONFIG.fields.enr.currentLevel), nextLevel: text(enrollment, enrT, CONFIG.fields.enr.nextLevel),
    programName: first(text(program, piT, CONFIG.fields.pi.name), program.name, "Shooting Challenge"),
    ...(assignments.length ? { homeworkAssignments: assignments } : {}),
  };
  if (!payload.activityDate || !payload.weekName) throw new Error("Submission Activity Date and Week Name are required.");
  if (payload.makes > payload.shots) throw new Error("Total Makes Counted cannot exceed Total Shots Counted.");
  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey, [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.sub, [CONFIG.fields.queue.eventType]: "DAILY_SUBMISSION", [CONFIG.fields.queue.template]: "DAILY_SUBMISSION",
    [CONFIG.fields.queue.source]: recordId, [CONFIG.fields.queue.enrollment]: enrollmentId, [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients), [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: cfg.testMode === undefined ? true : Boolean(cfg.testMode), [CONFIG.fields.queue.attempts]: 0,
  });
  debug("04 - Idempotent Email Handoff Queue create");
  const existing = (await queueT.selectRecordsAsync({ fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)) })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutput("statusOut", "error"); setOutput("actionOut", "needs_review"); throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }
  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    await clearBuildSignal(subT, recordId);
    setOutput("statusOut", "success"); setOutput("actionOut", "existing_handoff"); setOutput("queueRecordId", existing[0].id); setOutput("handoffKey", handoffKey); return;
  }
  const recheck = (await queueT.selectRecordsAsync({ fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)) })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) { await markQueueNeedsReview(queueT, recheck); throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`); }
    await clearBuildSignal(subT, recordId);
    setOutput("statusOut", "success"); setOutput("actionOut", "existing_handoff"); setOutput("queueRecordId", recheck[0].id); setOutput("handoffKey", handoffKey); return;
  }
  const created = await queueT.createRecordAsync(queueData);
  const afterCreate = (await queueT.selectRecordsAsync({ fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)) })).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) { await markQueueNeedsReview(queueT, afterCreate); throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`); }
  await queueT.updateRecordAsync(created, { [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.ready) });
  await clearBuildSignal(subT, recordId);
  setOutput("statusOut", "success"); setOutput("actionOut", "created_handoff"); setOutput("queueRecordId", created); setOutput("handoffKey", handoffKey); setOutput("errorOut", "");
  console.log(JSON.stringify({ automation: SCRIPT.scriptName, version: SCRIPT.version, statusOut: "success", actionOut: "created_handoff", queueRecordId: created, handoffKey }));
}

try { await main(); } catch (error) { setOutput("statusOut", "error"); setOutput("actionOut", "error"); setOutput("errorOut", String(error.message || error)); throw error; }