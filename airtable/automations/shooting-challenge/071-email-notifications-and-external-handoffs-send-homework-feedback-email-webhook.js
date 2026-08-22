/*
GitHub header
Automation: 071 - Email, Notifications, and External Handoffs - Create Homework Feedback Communications Hub Handoff
System: 127 SI Shooting Challenge
Source: Airtable Automation
Status: GitHub Source of Truth

Version: v4.2
Date Written: 2026-06-17
Last Updated: 2026-08-22

PURPOSE
- Validate one Homework Completion record that is ready for parent email.
- Create exactly one Ready Email Handoff Queue row for Communications Hub.
- Hand off template data to Automation 079 / Communications Hub / Resend.

IMPORTANT DESIGN RULES
- Hub owns subject, HTML, plain text, branding, delivery, and Delivery proof.
- This script never calls Make, Gmail, Resend, or the Communications Hub ingress.
- Only Automation 079 may send Email Handoff Queue rows to the Hub.
- One Homework Completion maps to HOMEWORK_FEEDBACK|HOMEWORK_COMPLETIONS|{HC Record ID}.
- Idempotent: reuse an existing matching Handoff Key; conflicting payload → Needs Review.
- Do not write Parent Feedback Sent? or Parent Feedback Sent On (Hub/downstream writeback).
- Preserve fail-closed ownership gates: PHA, assets, quiz path, XP, Satisfactory, Ready, Sent block.
- PHA operational identity is Program Instance + Week + Homework Assignment + Homework Slot.
- PHA Grade Band is descriptive eligibility metadata only (may list all bands). Never reject a handoff for Grade Band mismatch.
- Athlete Enrollment Grade Band may exist for display/XP elsewhere; it is not a PHA matching key.
- Homework asset URL uses Reviewer File URL only (no Google Drive fallback).
- Quiz-only path without assets must still work.
- Enrollment Parent Email - Cleaned is the authoritative recipient.
- testMode defaults true for controlled Hub sends.

TRIGGER (Airtable UI — keep unless Mike revises)
- Homework Completions when record matches conditions:
  Parent Feedback Ready? checked
  Parent Feedback Sent? unchecked
  Satisfactory? checked
  Award Status = Awarded
  Coach Feedback not empty
  Enrollment not empty

INPUT
- recordId (required Homework Completion record ID)
- testMode (optional; default true for controlled Hub sends)

OUTPUTS
- statusOut: success | skipped | error
- actionOut: created_handoff | existing_handoff | needs_review | error
- queueRecordId, handoffKey, errorOut, debugStep

FOLDER
- 07 - Email, Notifications, and External Handoffs

AUTOMATION NAME
- 071 - Email, Notifications, and External Handoffs - Create Homework Feedback Communications Hub Handoff
*/

// @ts-nocheck

const SCRIPT = {
  scriptName: "071 - Email, Notifications, and External Handoffs - Create Homework Feedback Communications Hub Handoff",
  version: "v4.2",
  versionDate: "2026-08-22",
  originalWrittenDate: "2026-06-17",
  lastUpdated: "2026-08-22",
  folder: "07 - Email, Notifications, and External Handoffs",
  automationName: "071 - Email, Notifications, and External Handoffs - Create Homework Feedback Communications Hub Handoff",
};

const CANONICAL_URLS = {
  landing: "https://www.fairfieldbasketballclub.com",
  shoot: "https://www.fairfieldbasketballclub.com/shoot",
  homework: "https://www.fairfieldbasketballclub.com/shoot/homework",
  dailyForm: "https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions",
};

const CONFIG = {
  tables: {
    hc: "Homework Completions",
    enr: "Enrollments",
    pha: "Program Homework Assignments",
    assets: "Submission Assets",
    sub: "Submissions",
    quiz: "Final Reflection Quiz Submissions",
    pi: "Program Instance - Sync",
    week: "Weeks",
    queue: "Email Handoff Queue",
  },
  statuses: { draft: "Draft", ready: "Ready", needsReview: "Needs Review" },
  fields: {
    hc: {
      enrollment: "Enrollment",
      week: "Week",
      grade: "Grade Band",
      homework: "Homework",
      slot: "Item Slot",
      pha: "Program Homework Assignment",
      assets: "Submission Assets",
      subs: "Submissions - Linked",
      quiz: "Final Reflection Quiz Submissions",
      satisfactory: "Satisfactory?",
      award: "Award Status",
      xp: "XP Events",
      coach: "Coach Feedback",
      ready: "Parent Feedback Ready?",
      sent: "Parent Feedback Sent?",
      error: "Parent Feedback Send Error",
      subject: "Parent Feedback Subject",
      totalXp: "Total Homework XP Awarded",
      baseXp: "Base XP Awarded",
    },
    enr: {
      active: "Active?",
      program: "Program Instance",
      grade: "Grade Band",
      parentClean: "Parent Email - Cleaned",
      parentFirst: "Parent First Name",
      athlete: "Full Athlete Name",
    },
    pha: {
      homework: "Homework Assignment",
      program: "Program Instance",
      week: "Week",
      // Grade Band is descriptive metadata only — never used for operational matching.
      grade: "Grade Band",
      slot: "Homework Slot",
      active: "Active?",
    },
    asset: {
      sub: "Submission - Linked",
      enr: "Enrollment - Linked",
      slot: "Asset Slot",
      original: "Original File Name",
      label: "Asset Label",
      reviewer: "Reviewer File URL",
    },
    sub: {
      enr: "Enrollment",
      week: "Week",
    },
    quiz: {
      summary: "Quiz Result Summary",
      score: "Score",
    },
    pi: {
      name: "Name - Program Instance",
    },
    week: {
      name: "Week Name",
    },
    queue: {
      key: "Handoff Key",
      status: "Status",
      sourceTable: "Source Table",
      eventType: "Event Type",
      payload: "Payload JSON",
      attempts: "Attempt Count",
      pi: "Program Instance Record ID",
      source: "Source Record ID",
      enrollment: "Enrollment Record ID",
      recipients: "Recipients JSON",
      template: "Template Key",
      testMode: "Test Mode?",
    },
  },
  values: {
    eventType: "HOMEWORK_FEEDBACK",
    templateKey: "HOMEWORK_FEEDBACK",
    sourceTableToken: "HOMEWORK_COMPLETIONS",
  },
};

function setOutput(name, value) {
  try {
    output.set(name, value);
  } catch {}
}

function debug(value) {
  setOutput("debugStep", value);
}

function exists(table, name) {
  try {
    table.getField(name);
    return true;
  } catch {
    return false;
  }
}

function raw(rec, table, name) {
  return rec && exists(table, name) ? rec.getCellValue(name) : null;
}

function text(rec, table, name) {
  return rec && exists(table, name) ? String(rec.getCellValueAsString(name) || "").trim() : "";
}

function ids(rec, table, name) {
  const value = raw(rec, table, name);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function checked(rec, table, name) {
  return raw(rec, table, name) === true;
}

function number(rec, table, name) {
  const value = raw(rec, table, name);
  const n = typeof value === "number" ? value : Number(text(rec, table, name).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function one(values, label) {
  if (values.length !== 1) throw new Error(`${label} must contain exactly one linked record; found ${values.length}.`);
  return values[0];
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function first(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function recipientEmail(rec, table, name) {
  const email = cleanEmail(text(rec, table, name));
  return validEmail(email) ? email : "";
}

function normalizeSlot(value) {
  const s = String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (["HW1", "HOMEWORK1"].includes(s)) return "HW1";
  if (["HW2", "HOMEWORK2"].includes(s)) return "HW2";
  return "";
}

function assetUrl(asset, assetTable) {
  return first(text(asset, assetTable, CONFIG.fields.asset.reviewer));
}

function selectValue(table, name, value) {
  const field = table.getField(name);
  if (field.type !== "singleSelect") return value;
  const choice = (field.options?.choices || []).find(
    (item) => String(item.name || "").toLowerCase() === String(value || "").toLowerCase()
  );
  if (!choice) throw new Error(`Missing option ${value} on ${table.name}.${name}`);
  return { name: choice.name };
}

function queueFields(queueTable, values) {
  return Object.fromEntries(Object.entries(values).filter(([name]) => exists(queueTable, name)));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function samePayload(left, right) {
  try {
    return stableJson(JSON.parse(left || "{}")) === stableJson(right);
  } catch {
    return false;
  }
}

async function markQueueNeedsReview(queueTable, rows) {
  for (const row of rows) {
    if (exists(queueTable, CONFIG.fields.queue.status)) {
      await queueTable.updateRecordAsync(row.id, {
        [CONFIG.fields.queue.status]: selectValue(queueTable, CONFIG.fields.queue.status, CONFIG.statuses.needsReview),
      });
    }
  }
}

async function main() {
  const cfg = input.config();
  const recordId = String(cfg.recordId || "").trim();
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
    throw new Error("recordId must be a valid Airtable record ID.");
  }
  const testMode = cfg.testMode === undefined ? true : Boolean(cfg.testMode);

  const hcT = base.getTable(CONFIG.tables.hc);
  const enrT = base.getTable(CONFIG.tables.enr);
  const phaT = base.getTable(CONFIG.tables.pha);
  const assetT = base.getTable(CONFIG.tables.assets);
  const subT = base.getTable(CONFIG.tables.sub);
  const quizT = base.getTable(CONFIG.tables.quiz);
  const queueT = base.getTable(CONFIG.tables.queue);

  debug("01 - Load Homework Completion");
  const hc = await hcT.selectRecordAsync(recordId);
  if (!hc) throw new Error(`Homework Completion not found: ${recordId}`);

  const handoffKey = `${CONFIG.values.eventType}|${CONFIG.values.sourceTableToken}|${recordId}`;

  debug("02 - Validate readiness gates");
  if (!checked(hc, hcT, CONFIG.fields.hc.ready)) {
    throw new Error("Parent Feedback Ready? is not checked. Handoff blocked.");
  }
  if (checked(hc, hcT, CONFIG.fields.hc.sent)) {
    throw new Error("Parent Feedback Sent? is already checked. Duplicate handoff blocked.");
  }
  if (!checked(hc, hcT, CONFIG.fields.hc.satisfactory)) {
    throw new Error("Satisfactory? is not checked. Handoff blocked.");
  }
  if (text(hc, hcT, CONFIG.fields.hc.award) !== "Awarded") {
    throw new Error("Award Status is not Awarded. Handoff blocked.");
  }
  const coachFeedback = text(hc, hcT, CONFIG.fields.hc.coach);
  if (!coachFeedback) throw new Error("Coach Feedback is blank. Handoff blocked.");
  if (
    ids(hc, hcT, CONFIG.fields.hc.xp).length === 0 ||
    number(hc, hcT, CONFIG.fields.hc.totalXp) <= 0 ||
    number(hc, hcT, CONFIG.fields.hc.baseXp) <= 0
  ) {
    throw new Error("Homework XP evidence is incomplete. Handoff blocked.");
  }

  debug("03 - Validate enrollment and schedule ownership");
  const enrollmentId = one(ids(hc, hcT, CONFIG.fields.hc.enrollment), "Homework Completion Enrollment");
  const weekId = one(ids(hc, hcT, CONFIG.fields.hc.week), "Homework Completion Week");
  const homeworkId = one(ids(hc, hcT, CONFIG.fields.hc.homework), "Homework Completion Homework");
  const enr = await enrT.selectRecordAsync(enrollmentId);
  if (!enr || !checked(enr, enrT, CONFIG.fields.enr.active)) {
    throw new Error("Enrollment is missing or inactive. Handoff blocked.");
  }
  const programId = one(ids(enr, enrT, CONFIG.fields.enr.program), "Enrollment Program Instance");
  // Athlete Grade Band is display/reporting metadata only — never used to match PHA.
  const hcGradeIds = ids(hc, hcT, CONFIG.fields.hc.grade);
  const enrGradeIds = ids(enr, enrT, CONFIG.fields.enr.grade);
  const athleteGradeIds = hcGradeIds.length ? hcGradeIds : enrGradeIds;
  const gradeId = athleteGradeIds.length === 1 ? athleteGradeIds[0] : "";
  const hcSlot = normalizeSlot(text(hc, hcT, CONFIG.fields.hc.slot));
  if (!hcSlot) throw new Error("Homework Completion Item Slot must resolve to HW1 or HW2.");

  const phaIds = ids(hc, hcT, CONFIG.fields.hc.pha);
  if (phaIds.length === 0) {
    throw new Error("Program Homework Assignment is not linked. Handoff blocked.");
  }
  if (phaIds.length > 1) {
    throw new Error("Homework Completion links multiple Program Homework Assignments. Handoff blocked.");
  }
  const canonicalPha = await phaT.selectRecordAsync(phaIds[0]);
  if (!canonicalPha || !checked(canonicalPha, phaT, CONFIG.fields.pha.active)) {
    throw new Error("Linked Program Homework Assignment is missing/inactive. Handoff blocked.");
  }
  // Operational identity: Program Instance + Week + Homework Assignment + Homework Slot.
  // PHA Grade Band is descriptive metadata only and must never reject this handoff
  // (including when PHA lists multiple bands such as K-2, 3-4, 5-6, 7-8, 9-12).
  if (!sameSet(ids(canonicalPha, phaT, CONFIG.fields.pha.program), [programId])) {
    throw new Error("PHA Program Instance mismatch.");
  }
  if (!sameSet(ids(canonicalPha, phaT, CONFIG.fields.pha.week), [weekId])) {
    throw new Error("PHA Week mismatch.");
  }
  if (!sameSet(ids(canonicalPha, phaT, CONFIG.fields.pha.homework), [homeworkId])) {
    throw new Error("PHA Homework mismatch.");
  }
  if (normalizeSlot(text(canonicalPha, phaT, CONFIG.fields.pha.slot)) !== hcSlot) {
    throw new Error("PHA Homework Slot mismatch.");
  }

  debug("04 - Validate linked submissions, assets, and quiz path");
  const hcSubIds = ids(hc, hcT, CONFIG.fields.hc.subs);
  for (const sid of hcSubIds) {
    const s = await subT.selectRecordAsync(sid);
    if (!s) throw new Error(`Linked Submission not found: ${sid}`);
    if (!sameSet(ids(s, subT, CONFIG.fields.sub.enr), [enrollmentId])) {
      throw new Error(`Submission ${sid} Enrollment mismatch.`);
    }
    if (!sameSet(ids(s, subT, CONFIG.fields.sub.week), [weekId])) {
      throw new Error(`Submission ${sid} Week mismatch.`);
    }
  }

  const assetIds = ids(hc, hcT, CONFIG.fields.hc.assets);
  const files = [];
  for (const aid of assetIds) {
    const a = await assetT.selectRecordAsync(aid);
    if (!a) throw new Error(`Submission Asset not found: ${aid}`);
    if (!sameSet(ids(a, assetT, CONFIG.fields.asset.enr), [enrollmentId])) {
      throw new Error(`Asset ${aid} Enrollment mismatch.`);
    }
    const slot = normalizeSlot(text(a, assetT, CONFIG.fields.asset.slot));
    if (slot !== hcSlot) {
      throw new Error(`Asset ${aid} slot ${slot || "blank"} does not match ${hcSlot}.`);
    }
    const sourceSubs = ids(a, assetT, CONFIG.fields.asset.sub);
    if (sourceSubs.length !== 1) {
      throw new Error(`Asset ${aid} must link exactly one Submission.`);
    }
    const s = await subT.selectRecordAsync(sourceSubs[0]);
    if (
      !s ||
      !sameSet(ids(s, subT, CONFIG.fields.sub.enr), [enrollmentId]) ||
      !sameSet(ids(s, subT, CONFIG.fields.sub.week), [weekId])
    ) {
      throw new Error(`Asset ${aid} source Submission ownership/Week mismatch.`);
    }
    const url = assetUrl(a, assetT);
    if (!url) throw new Error(`Asset ${aid} has no safe parent-facing URL.`);
    files.push({
      id: aid,
      url,
      label: first(
        text(a, assetT, CONFIG.fields.asset.original),
        text(a, assetT, CONFIG.fields.asset.label),
        "View submitted homework"
      ),
    });
  }

  const quizIds = ids(hc, hcT, CONFIG.fields.hc.quiz);
  if (assetIds.length === 0 && quizIds.length === 0) {
    throw new Error(
      "Homework Completion has neither validated Submission Assets nor Final Reflection Quiz source. Handoff blocked."
    );
  }
  let quizSummary = "";
  if (quizIds.length) {
    if (quizIds.length !== 1) {
      throw new Error("Multiple Final Reflection Quiz sources linked. Handoff blocked.");
    }
    const q = await quizT.selectRecordAsync(quizIds[0]);
    if (!q) throw new Error("Final Reflection Quiz source not found.");
    quizSummary = first(text(q, quizT, CONFIG.fields.quiz.summary), text(q, quizT, CONFIG.fields.quiz.score));
  }

  debug("05 - Resolve recipients and Hub payload");
  const parent = recipientEmail(enr, enrT, CONFIG.fields.enr.parentClean);
  if (!parent) throw new Error("No usable cleaned parent recipient on Enrollment.");
  const athleteName = first(text(enr, enrT, CONFIG.fields.enr.athlete), "Athlete");
  const homeworkLabel = text(hc, hcT, CONFIG.fields.hc.homework);
  const totalHomeworkXpAwarded = number(hc, hcT, CONFIG.fields.hc.totalXp);

  let programName = "";
  try {
    const piT = base.getTable(CONFIG.tables.pi);
    const pi = await piT.selectRecordAsync(programId);
    if (pi) programName = first(text(pi, piT, CONFIG.fields.pi.name), pi.name);
  } catch {}

  let weekName = "";
  try {
    const weekT = base.getTable(CONFIG.tables.week);
    const weekRec = await weekT.selectRecordAsync(weekId);
    if (weekRec) weekName = text(weekRec, weekT, CONFIG.fields.week.name);
  } catch {}

  const recipients = [{ email: parent, role: "guardian" }];
  const payload = {
    athleteName,
    parentFirstName: text(enr, enrT, CONFIG.fields.enr.parentFirst),
    homeworkTitle: homeworkLabel,
    homeworkLabel,
    coachFeedback,
    totalHomeworkXpAwarded,
    quizSummary,
    submittedFiles: files,
    homeworkSlot: hcSlot,
    programName: programName || undefined,
    weekName: weekName || undefined,
    reviewStatus: "Satisfactory",
    landingPageUrl: CANONICAL_URLS.landing,
    shootPageUrl: CANONICAL_URLS.shoot,
    homeworkPageUrl: CANONICAL_URLS.homework,
    canonicalProgramHomeworkAssignmentId: canonicalPha.id,
    canonicalProgramInstanceId: programId,
    canonicalWeekId: weekId,
    canonicalGradeBandId: gradeId || undefined,
  };
  if (!payload.programName) delete payload.programName;
  if (!payload.weekName) delete payload.weekName;
  if (!payload.canonicalGradeBandId) delete payload.canonicalGradeBandId;

  const queueData = queueFields(queueT, {
    [CONFIG.fields.queue.key]: handoffKey,
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.draft),
    [CONFIG.fields.queue.sourceTable]: CONFIG.tables.hc,
    [CONFIG.fields.queue.eventType]: selectValue(queueT, CONFIG.fields.queue.eventType, CONFIG.values.eventType),
    [CONFIG.fields.queue.template]: CONFIG.values.templateKey,
    [CONFIG.fields.queue.source]: recordId,
    [CONFIG.fields.queue.enrollment]: enrollmentId,
    [CONFIG.fields.queue.pi]: programId,
    [CONFIG.fields.queue.recipients]: JSON.stringify(recipients),
    [CONFIG.fields.queue.payload]: JSON.stringify(payload),
    [CONFIG.fields.queue.testMode]: testMode,
    [CONFIG.fields.queue.attempts]: 0,
  });

  debug("06 - Idempotent Email Handoff Queue create");
  const existing = (
    await queueT.selectRecordsAsync({
      fields: Object.values(CONFIG.fields.queue).filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);

  if (existing.length > 1) {
    await markQueueNeedsReview(queueT, existing);
    setOutput("statusOut", "error");
    setOutput("actionOut", "needs_review");
    throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey}.`);
  }

  if (existing.length === 1) {
    if (!samePayload(text(existing[0], queueT, CONFIG.fields.queue.payload), payload)) {
      await markQueueNeedsReview(queueT, existing);
      setOutput("statusOut", "error");
      setOutput("actionOut", "needs_review");
      throw new Error(`Conflicting Email Handoff Queue payload for ${handoffKey}.`);
    }
    if (exists(hcT, CONFIG.fields.hc.error)) {
      await hcT.updateRecordAsync(recordId, { [CONFIG.fields.hc.error]: "" });
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", existing[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    console.log(
      JSON.stringify({
        automation: SCRIPT.scriptName,
        version: SCRIPT.version,
        statusOut: "success",
        actionOut: "existing_handoff",
        queueRecordId: existing[0].id,
        handoffKey,
      })
    );
    return;
  }

  const recheck = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (recheck.length) {
    if (recheck.length > 1) {
      await markQueueNeedsReview(queueT, recheck);
      throw new Error(`Multiple Email Handoff Queue rows match ${handoffKey} after recheck.`);
    }
    setOutput("statusOut", "success");
    setOutput("actionOut", "existing_handoff");
    setOutput("queueRecordId", recheck[0].id);
    setOutput("handoffKey", handoffKey);
    setOutput("errorOut", "");
    return;
  }

  const created = await queueT.createRecordAsync(queueData);
  const afterCreate = (
    await queueT.selectRecordsAsync({
      fields: [CONFIG.fields.queue.key].filter((name) => exists(queueT, name)),
    })
  ).records.filter((row) => text(row, queueT, CONFIG.fields.queue.key) === handoffKey);
  if (afterCreate.length !== 1) {
    await markQueueNeedsReview(queueT, afterCreate);
    throw new Error(`Concurrent Email Handoff Queue creation requires review for ${handoffKey}.`);
  }

  await queueT.updateRecordAsync(created, {
    [CONFIG.fields.queue.status]: selectValue(queueT, CONFIG.fields.queue.status, CONFIG.statuses.ready),
  });

  const hcUpdates = {};
  if (exists(hcT, CONFIG.fields.hc.error)) hcUpdates[CONFIG.fields.hc.error] = "";
  if (exists(hcT, CONFIG.fields.hc.subject)) {
    hcUpdates[CONFIG.fields.hc.subject] = `Homework Feedback Hub handoff prepared for ${athleteName}`;
  }
  if (Object.keys(hcUpdates).length) await hcT.updateRecordAsync(recordId, hcUpdates);

  setOutput("statusOut", "success");
  setOutput("actionOut", "created_handoff");
  setOutput("queueRecordId", created);
  setOutput("handoffKey", handoffKey);
  setOutput("errorOut", "");
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: "success",
      actionOut: "created_handoff",
      queueRecordId: created,
      handoffKey,
    })
  );
}

try {
  await main();
} catch (error) {
  setOutput("statusOut", "error");
  setOutput("actionOut", "error");
  setOutput("errorOut", String(error.message || error));
  try {
    const cfg = input.config();
    const recordId = String(cfg.recordId || "").trim();
    if (/^rec[A-Za-z0-9]{14}$/.test(recordId)) {
      const hcT = base.getTable(CONFIG.tables.hc);
      if (exists(hcT, CONFIG.fields.hc.error)) {
        await hcT.updateRecordAsync(recordId, {
          [CONFIG.fields.hc.error]: String(error.message || error),
        });
      }
    }
  } catch {}
  throw error;
}
