/*
Extension Script: Audit Curriculum / PHA Cross-Year Integrity
System: 127 SI Shooting Challenge
Purpose:
  Read-only audit of FBC Curriculum - SYNC vs Program Homework Assignments vs
  Submissions / Homework Completions for cross-year and Week/PI contamination.

  Checks:
  - All PHA rows: Schedule Key uniqueness, PI/Week/GB/slot completeness
  - Library Week links pointing at Weeks outside the PHA Program Instance
  - Submissions (optional filter): Homework + Week vs resolvable PHA for enrollment
  - PWTEST / legacy week name patterns
  - Controlled fixture IDs from 2026-08-09 audit

Default: read-only (no writes)

Recommended follow-up:
  docs/prod-completion/2026-08-09/HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md
*/

// @ts-nocheck

const SAMPLE_LIMIT = 40;

const FIXTURES = {
  programInstance2026: "rec5mEM0YPqPqq0hZ",
  enrollmentSchmidt: "recCyFEPeATOVNlr9",
  weekEarlyBirdTesting: "recWeVrSabnsYaHc2",
  weekPwtest: "reci5GdxEC57vfoS3",
  weekLegacy2025Hw12: "recnMGC2JBHjO0ay6",
  gradeBand34: "reclWDQZzKbVBtdhG",
  libraryShotTracker: "rechVLOeyEVIqmy2v",
  libraryWebsite: "rec6WmXjpLtIWDERo",
  phaHw1: "reca5GM1JkROhXOiy",
  phaHw2: "reccQhrgOK8e8Yngv",
  failingSubmission: "reccRpYDUfh3Pddzy",
  failingAsset: "recIoGmcCgvxmgEAh",
};

const CONFIG = {
  scriptName: "audit-curriculum-pha-cross-year-integrity",
  version: "v1.0.0",

  tables: {
    curriculum: "FBC Curriculum - SYNC",
    pha: "Program Homework Assignments",
    weeks: "Weeks",
    enrollments: "Enrollments",
    submissions: "Submissions",
    assets: "Submission Assets",
    homework: "Homework Completions",
    programInstances: "Program Instance - Synced",
  },

  curriculum: {
    title: "Assignment Title",
    display: "Assignment Full Name - Display",
    fullName: "Assignment Full Name",
    week: "Week",
    gradeBand: "Grade Band",
    active: "Active?",
    published: "Published?",
    homeworkNumber: "Homework Number",
  },

  pha: {
    display: "Program Homework Assignment Display",
    homework: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band",
    slot: "Homework Slot",
    active: "Active?",
    scheduleKey: "Schedule Key",
  },

  weeks: {
    name: "Week Name",
    programInstance: "Program Instance",
    startDate: "Start Date",
    endDate: "End Date",
    active: "Active Week?",
  },

  enrollments: {
    programInstance: "Program Instance",
    gradeBand: "Grade Band",
    schoolYear: "School Year",
  },

  submissions: {
    enrollment: "Enrollment",
    week: "Week",
    homework1: "Homework Name 1",
    homework2: "Homework Name 2",
    activityDate: "Activity Date",
  },

  assets: {
    submission: "Submission - Linked",
    enrollment: "Enrollment - Linked",
    assetPurpose: "Asset Purpose",
    assetSlot: "Asset Slot",
    homeworkCompletions: "Homework Completions",
    attachment: "Airtable Attachment",
  },

  homework: {
    enrollment: "Enrollment",
    week: "Week",
    homework: "Homework",
    pha: "Program Homework Assignment",
    slot: "Item Slot",
  },
};

function cell(record, fieldName) {
  try {
    return record.getCellValue(fieldName);
  } catch {
    return null;
  }
}

function text(record, fieldName) {
  try {
    return String(record.getCellValueAsString(fieldName) || "").trim();
  } catch {
    return "";
  }
}

function linkedIds(record, fieldName) {
  const value = cell(record, fieldName);
  return Array.isArray(value) ? value.map((item) => item?.id).filter(Boolean) : [];
}

function selectName(record, fieldName) {
  const value = cell(record, fieldName);
  return value?.name ? String(value.name).trim() : "";
}

function unload(query) {
  if (typeof query?.unloadData === "function") {
    try {
      query.unloadData();
    } catch {}
  }
}

function inferSlot(asset) {
  const slot = selectName(asset, CONFIG.assets.assetSlot);
  if (slot === "HW1" || slot === "HW2") return slot;
  const purpose = selectName(asset, CONFIG.assets.assetPurpose);
  if (purpose === "Homework 1") return "HW1";
  if (purpose === "Homework 2") return "HW2";
  return "";
}

function buildPhaIndex(phaRecords) {
  const byScheduleKey = new Map();
  const byExact = new Map();
  const rows = [];

  for (const record of phaRecords) {
    const homeworkIds = linkedIds(record, CONFIG.pha.homework);
    const piIds = linkedIds(record, CONFIG.pha.programInstance);
    const weekIds = linkedIds(record, CONFIG.pha.week);
    const gbIds = linkedIds(record, CONFIG.pha.gradeBand);
    const slot = selectName(record, CONFIG.pha.slot);
    const active = cell(record, CONFIG.pha.active) === true;
    const scheduleKey = text(record, CONFIG.pha.scheduleKey);

    const row = {
      id: record.id,
      display: text(record, CONFIG.pha.display),
      homeworkId: homeworkIds[0] || "",
      programInstanceId: piIds[0] || "",
      weekId: weekIds[0] || "",
      gradeBandId: gbIds[0] || "",
      slot,
      active,
      scheduleKey,
      incomplete:
        homeworkIds.length !== 1 ||
        piIds.length !== 1 ||
        weekIds.length !== 1 ||
        gbIds.length !== 1 ||
        !(slot === "HW1" || slot === "HW2"),
    };
    rows.push(row);

    if (scheduleKey) {
      if (!byScheduleKey.has(scheduleKey)) byScheduleKey.set(scheduleKey, []);
      byScheduleKey.get(scheduleKey).push(record.id);
    }

    if (homeworkIds[0] && piIds[0] && weekIds[0] && gbIds[0] && slot) {
      const exactKey = [piIds[0], weekIds[0], gbIds[0], slot, homeworkIds[0]].join("|");
      if (!byExact.has(exactKey)) byExact.set(exactKey, []);
      byExact.get(exactKey).push(record.id);
    }
  }

  return { rows, byScheduleKey, byExact };
}

function resolvePha(byExact, { programInstanceId, weekId, gradeBandId, slot, homeworkId, activeOnly = true }) {
  const key = [programInstanceId, weekId, gradeBandId, slot, homeworkId].join("|");
  const ids = byExact.get(key) || [];
  return ids;
}

async function loadWeekMap(weeksTable) {
  const query = await weeksTable.selectRecordsAsync({
    fields: [CONFIG.weeks.name, CONFIG.weeks.programInstance, CONFIG.weeks.active],
  });
  const map = new Map();
  for (const record of query.records) {
    map.set(record.id, {
      id: record.id,
      name: text(record, CONFIG.weeks.name),
      programInstanceIds: linkedIds(record, CONFIG.weeks.programInstance),
      active: cell(record, CONFIG.weeks.active) === true,
    });
  }
  unload(query);
  return map;
}

async function auditControlledRecords({ submissionsTable, assetsTable, enrollmentsTable, byExact }) {
  const out = { fixtures: FIXTURES, checks: [] };

  const enrollment = await enrollmentsTable.selectRecordAsync(FIXTURES.enrollmentSchmidt, {
    fields: [CONFIG.enrollments.programInstance, CONFIG.enrollments.gradeBand, CONFIG.enrollments.schoolYear],
  });
  if (enrollment) {
    out.enrollment = {
      id: enrollment.id,
      schoolYear: selectName(enrollment, CONFIG.enrollments.schoolYear),
      programInstanceIds: linkedIds(enrollment, CONFIG.enrollments.programInstance),
      gradeBandIds: linkedIds(enrollment, CONFIG.enrollments.gradeBand),
    };
  }

  const submission = await submissionsTable.selectRecordAsync(FIXTURES.failingSubmission, {
    fields: [CONFIG.submissions.enrollment, CONFIG.submissions.week, CONFIG.submissions.homework1, CONFIG.submissions.homework2],
  });
  if (submission) {
    const weekIds = linkedIds(submission, CONFIG.submissions.week);
    const hw1 = linkedIds(submission, CONFIG.submissions.homework1);
    const enrIds = linkedIds(submission, CONFIG.submissions.enrollment);
    const enrPi = out.enrollment?.programInstanceIds?.[0] || "";
    const enrGb = out.enrollment?.gradeBandIds?.[0] || "";
    const phaMatchesHw1 = resolvePha(byExact, {
      programInstanceId: enrPi,
      weekId: weekIds[0] || "",
      gradeBandId: enrGb,
      slot: "HW1",
      homeworkId: hw1[0] || "",
    });
    out.failingSubmission = {
      id: submission.id,
      enrollmentIds: enrIds,
      weekIds,
      homework1Ids: hw1,
      homework2Ids: linkedIds(submission, CONFIG.submissions.homework2),
      phaMatchesHw1,
      expectedPhaForEarlyBirdHw1:
        weekIds[0] === FIXTURES.weekEarlyBirdTesting && hw1[0] === FIXTURES.libraryShotTracker
          ? [FIXTURES.phaHw1]
          : [],
      diagnosis:
        phaMatchesHw1.length === 0
          ? "No PHA exact match for Submission Week + HW1 + Enrollment PI/GB"
          : phaMatchesHw1.length === 1
            ? "PHA match exists"
            : "Multiple PHA matches",
    };
  }

  const asset = await assetsTable.selectRecordAsync(FIXTURES.failingAsset, {
    fields: [
      CONFIG.assets.submission,
      CONFIG.assets.enrollment,
      CONFIG.assets.assetPurpose,
      CONFIG.assets.assetSlot,
      CONFIG.assets.homeworkCompletions,
      CONFIG.assets.attachment,
    ],
  });
  if (asset) {
    out.failingAsset = {
      id: asset.id,
      submissionIds: linkedIds(asset, CONFIG.assets.submission),
      enrollmentIds: linkedIds(asset, CONFIG.assets.enrollment),
      slot: inferSlot(asset),
      homeworkCompletionIds: linkedIds(asset, CONFIG.assets.homeworkCompletions),
      hasAttachment: Array.isArray(cell(asset, CONFIG.assets.attachment)) && cell(asset, CONFIG.assets.attachment).length > 0,
    };
  }

  return out;
}

async function main() {
  const curriculumTable = base.getTable(CONFIG.tables.curriculum);
  const phaTable = base.getTable(CONFIG.tables.pha);
  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const submissionsTable = base.getTable(CONFIG.tables.submissions);
  const assetsTable = base.getTable(CONFIG.tables.assets);
  const homeworkTable = base.getTable(CONFIG.tables.homework);

  const weekMap = await loadWeekMap(weeksTable);

  const phaQuery = await phaTable.selectRecordsAsync({ fields: Object.values(CONFIG.pha) });
  const phaIndex = buildPhaIndex(phaQuery.records);
  unload(phaQuery);

  const duplicateScheduleKeys = [...phaIndex.byScheduleKey.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ scheduleKey: key, phaIds: ids }));

  const duplicateExactActive = [...phaIndex.byExact.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ exactKey: key, phaIds: ids }));

  const curriculumQuery = await curriculumTable.selectRecordsAsync({
    fields: [
      CONFIG.curriculum.title,
      CONFIG.curriculum.display,
      CONFIG.curriculum.week,
      CONFIG.curriculum.gradeBand,
      CONFIG.curriculum.active,
      CONFIG.curriculum.published,
      CONFIG.curriculum.homeworkNumber,
    ],
  });

  const libraryRows = [];
  const legacyWeekMismatches = [];
  const pwtestNameHits = [];
  const titleGroups = new Map();

  for (const record of curriculumQuery.records) {
    const title = text(record, CONFIG.curriculum.title);
    const weekIds = linkedIds(record, CONFIG.curriculum.week);
    const display = text(record, CONFIG.curriculum.display);
    const row = {
      id: record.id,
      title,
      homeworkNumber: selectName(record, CONFIG.curriculum.homeworkNumber),
      weekIds,
      weekNames: weekIds.map((id) => weekMap.get(id)?.name || id),
      gradeBandCount: linkedIds(record, CONFIG.curriculum.gradeBand).length,
      active: cell(record, CONFIG.curriculum.active) === true,
      published: cell(record, CONFIG.curriculum.published) === true,
      display,
    };
    libraryRows.push(row);

    if (!titleGroups.has(title)) titleGroups.set(title, []);
    titleGroups.get(title).push(record.id);

    if (/PWTEST/i.test(display) || /PWTEST/i.test(title)) {
      pwtestNameHits.push({ id: record.id, title, display, weekIds });
    }

    for (const weekId of weekIds) {
      const week = weekMap.get(weekId);
      if (!week) continue;
      const activePhaForLib = phaIndex.rows.filter((p) => p.homeworkId === record.id && p.active);
      for (const pha of activePhaForLib) {
        if (pha.weekId && weekId !== pha.weekId) {
          legacyWeekMismatches.push({
            libraryId: record.id,
            libraryTitle: title,
            libraryWeekId: weekId,
            libraryWeekName: week.name,
            phaId: pha.id,
            phaWeekId: pha.weekId,
            note: "Library Week link differs from active PHA Week for same homework",
          });
        }
        if (week.programInstanceIds.length && pha.programInstanceId && !week.programInstanceIds.includes(pha.programInstanceId)) {
          legacyWeekMismatches.push({
            libraryId: record.id,
            libraryTitle: title,
            libraryWeekId: weekId,
            libraryWeekPi: week.programInstanceIds,
            phaId: pha.id,
            phaProgramInstanceId: pha.programInstanceId,
            note: "Library Week PI differs from PHA Program Instance",
          });
        }
      }
    }
  }
  unload(curriculumQuery);

  const duplicateTitles = [...titleGroups.entries()]
    .filter(([, ids]) => ids.length > 1 && ids[0])
    .map(([title, ids]) => ({ title, ids, count: ids.length }));

  const submissionsQuery = await submissionsTable.selectRecordsAsync({
    fields: [CONFIG.submissions.enrollment, CONFIG.submissions.week, CONFIG.submissions.homework1, CONFIG.submissions.homework2],
  });

  const submissionMismatches = [];
  const enrollmentCache = new Map();

  for (const record of submissionsQuery.records) {
    const hw1 = linkedIds(record, CONFIG.submissions.homework1);
    const hw2 = linkedIds(record, CONFIG.submissions.homework2);
    if (!hw1.length && !hw2.length) continue;

    const weekIds = linkedIds(record, CONFIG.submissions.week);
    if (weekIds.length !== 1) {
      submissionMismatches.push({ submissionId: record.id, issue: "week_not_exactly_one", weekCount: weekIds.length });
      continue;
    }

    const enrIds = linkedIds(record, CONFIG.submissions.enrollment);
    if (enrIds.length !== 1) continue;

    let enr = enrollmentCache.get(enrIds[0]);
    if (!enr) {
      const enrTable = base.getTable(CONFIG.tables.enrollments);
      const enrRec = await enrTable.selectRecordAsync(enrIds[0], {
        fields: [CONFIG.enrollments.programInstance, CONFIG.enrollments.gradeBand],
      });
      enr = enrRec
        ? {
            programInstanceId: linkedIds(enrRec, CONFIG.enrollments.programInstance)[0] || "",
            gradeBandId: linkedIds(enrRec, CONFIG.enrollments.gradeBand)[0] || "",
          }
        : { programInstanceId: "", gradeBandId: "" };
      enrollmentCache.set(enrIds[0], enr);
    }

    for (const [slot, hwIds] of [
      ["HW1", hw1],
      ["HW2", hw2],
    ]) {
      if (hwIds.length !== 1) continue;
      const matches = resolvePha(phaIndex.byExact, {
        programInstanceId: enr.programInstanceId,
        weekId: weekIds[0],
        gradeBandId: enr.gradeBandId,
        slot,
        homeworkId: hwIds[0],
      });
      const activeMatches = matches.filter((id) => phaIndex.rows.find((r) => r.id === id)?.active);
      if (activeMatches.length === 0) {
        submissionMismatches.push({
          submissionId: record.id,
          slot,
          homeworkId: hwIds[0],
          weekId: weekIds[0],
          programInstanceId: enr.programInstanceId,
          gradeBandId: enr.gradeBandId,
          issue: "no_active_pha_match",
        });
      } else if (activeMatches.length > 1) {
        submissionMismatches.push({
          submissionId: record.id,
          slot,
          issue: "multiple_active_pha_match",
          phaIds: activeMatches,
        });
      }
    }
  }
  unload(submissionsQuery);

  const controlled = await auditControlledRecords({
    submissionsTable,
    assetsTable,
    enrollmentsTable: base.getTable(CONFIG.tables.enrollments),
    byExact: phaIndex.byExact,
  });

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    generatedAt: new Date().toISOString(),
    summary: {
      phaTotal: phaIndex.rows.length,
      phaActive: phaIndex.rows.filter((r) => r.active).length,
      phaIncomplete: phaIndex.rows.filter((r) => r.incomplete).length,
      duplicateScheduleKeys: duplicateScheduleKeys.length,
      duplicateExactKeys: duplicateExactActive.length,
      libraryTotal: libraryRows.length,
      duplicateLibraryTitles: duplicateTitles.length,
      legacyWeekMismatchCount: legacyWeekMismatches.length,
      submissionPhaMismatches: submissionMismatches.length,
      pwtestLibraryNameHits: pwtestNameHits.length,
    },
    phaRows: phaIndex.rows,
    duplicateScheduleKeys,
    duplicateExactActive,
    duplicateLibraryTitles: duplicateTitles.slice(0, SAMPLE_LIMIT),
    legacyWeekMismatches: legacyWeekMismatches.slice(0, SAMPLE_LIMIT),
    pwtestNameHits,
    submissionMismatches: submissionMismatches.slice(0, SAMPLE_LIMIT),
    controlled,
    samples: {
      libraryCanonical: libraryRows.filter((r) =>
        [FIXTURES.libraryShotTracker, FIXTURES.libraryWebsite].includes(r.id),
      ),
    },
  };

  console.log(JSON.stringify(report, null, 2));
  output.set("reportJson", JSON.stringify(report));
  output.set("submissionMismatchCount", submissionMismatches.length);
  output.set("phaActiveCount", report.summary.phaActive);
  output.set("statusOut", "success");
}

await main();
