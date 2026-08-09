/*
Extension Script: Audit Homework 17 Reflection Quiz -> Homework Completion Pipeline
System: 127 SI Shooting Challenge
Purpose:
  Read-only audit of the Final Reflection Quiz Submissions (Fillout Homework 17 test)
  intake and whether each row can flow into a normal Homework Completion.

  This script NEVER writes. It reports, for every quiz submission:
    - already linked to a Homework Completion
    - safe Enrollment match (exactly one Enrollment link)
    - no Enrollment / multiple Enrollment (needs review)
    - HW 17 Homework Library content record found / missing
    - HW 17 PHA schedule (PI + GB + HW1 slot) found / missing per Enrollment
    - would-create vs would-update a Homework Completion (native dedupe:
      Enrollment | Week | Homework, mirroring Homework Completion Key)
    - duplicate-risk (more than one existing completion for the same key)
    - an exact preview list of the records that WOULD be created or updated

Run this BEFORE the backfill (safe-backfills/backfill-homework17-completions-from-reflection-quiz.js).

Default: read-only (no writes)
*/

// @ts-nocheck

const PREVIEW_LIMIT = 200;
const SAMPLE_LIMIT = 50;

const CONFIG = {
  scriptName: "audit-homework17-reflection-quiz-pipeline",
  version: "v1.0",

  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    homeworkLibrary: "Homework Library",
    programHomeworkAssignments: "Program Homework Assignments",
    enrollments: "Enrollments",
  },

  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    score: "Score",
    targetScoreMet: "Target Score Met?",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    finalQuiz: "Final Reflection Quiz Submissions",
    completionKey: "Homework Completion Key",
    completionStatus: "Completion Status",
  },

  homeworkLibrary: {
    homeworkNumber: "Homework Number",
    active: "Active?",
    title: "Assignment Title",
  },

  pha: {
    homeworkAssignment: "Homework Assignment",
    programInstance: "Program Instance",
    week: "Week",
    gradeBand: "Grade Band",
    slot: "Homework Slot",
    active: "Active?",
  },

  enrollments: {
    gradeBand: "Grade Band",
    programInstance: "Program Instance",
  },

  values: {
    homeworkNumber17: "HW 17",
    slotHw1: "HW1",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
}

function getText(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getBooleanish(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  const raw = record.getCellValue(fieldName);
  return raw === true || raw === 1 || String(raw).toLowerCase() === "true";
}

function getLinkedIds(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return [];
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw)) return [];
  return raw.map(item => item?.id).filter(Boolean);
}

function buildDedupeKey(enrollmentId, weekId, homeworkId) {
  return `${enrollmentId || ""}|${weekId || ""}|${homeworkId || ""}`;
}

async function main() {
  const quizTable = base.getTable(CONFIG.tables.quiz);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const homeworkLibraryTable = base.getTable(CONFIG.tables.homeworkLibrary);
  const phaTable = base.getTable(CONFIG.tables.programHomeworkAssignments);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const quizFields = Object.values(CONFIG.quiz).filter(name => fieldExists(quizTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const libraryFields = Object.values(CONFIG.homeworkLibrary).filter(name =>
    fieldExists(homeworkLibraryTable, name)
  );
  const phaFields = Object.values(CONFIG.pha).filter(name => fieldExists(phaTable, name));
  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name =>
    fieldExists(enrollmentsTable, name)
  );

  const [quizQuery, homeworkQuery, libraryQuery, phaQuery, enrollmentQuery] = await Promise.all([
    quizTable.selectRecordsAsync({ fields: quizFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    homeworkLibraryTable.selectRecordsAsync({ fields: libraryFields }),
    phaTable.selectRecordsAsync({ fields: phaFields }),
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
  ]);

  const hw17Records = libraryQuery.records.filter(record => {
    const number = getSelectName(record, homeworkLibraryTable, CONFIG.homeworkLibrary.homeworkNumber);
    const active = getBooleanish(record, homeworkLibraryTable, CONFIG.homeworkLibrary.active);
    return number === CONFIG.values.homeworkNumber17 && active;
  });

  const hw17ResolvedOne = hw17Records.length === 1;
  const hw17Record = hw17ResolvedOne ? hw17Records[0] : null;
  const hw17Id = hw17Record ? hw17Record.id : "";

  const enrollmentById = new Map(enrollmentQuery.records.map(record => [record.id, record]));

  function resolvePhaWeekForEnrollment(enrollmentId) {
    const enrollment = enrollmentById.get(enrollmentId);
    if (!enrollment) return { error: "enrollment_not_found" };

    const programInstanceId =
      getLinkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.programInstance)[0] || "";
    const gradeBandId =
      getLinkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.gradeBand)[0] || "";

    if (!programInstanceId || !gradeBandId) {
      return { error: "missing_pi_or_grade_band" };
    }

    const matches = phaQuery.records.filter(record => {
      const libraryId = getLinkedIds(record, phaTable, CONFIG.pha.homeworkAssignment)[0] || "";
      const phaPi = getLinkedIds(record, phaTable, CONFIG.pha.programInstance)[0] || "";
      const phaGb = getLinkedIds(record, phaTable, CONFIG.pha.gradeBand)[0] || "";
      const phaSlot = getSelectName(record, phaTable, CONFIG.pha.slot);
      const active = getBooleanish(record, phaTable, CONFIG.pha.active);

      return (
        libraryId === hw17Id &&
        phaPi === programInstanceId &&
        phaGb === gradeBandId &&
        phaSlot === CONFIG.values.slotHw1 &&
        active
      );
    });

    if (matches.length !== 1) {
      return { error: "pha_not_exactly_one", matchCount: matches.length };
    }

    const weekIds = getLinkedIds(matches[0], phaTable, CONFIG.pha.week);
    if (weekIds.length !== 1) {
      return { error: "pha_week_not_exactly_one", weekCount: weekIds.length };
    }

    return { hw17WeekId: weekIds[0], phaId: matches[0].id };
  }

  // 2. Index existing Homework Completions by dedupe key (Enrollment|Week|Homework).
  const completionsByKey = new Map();
  for (const completion of homeworkQuery.records) {
    const enrollmentId = getLinkedIds(completion, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    const weekId = getLinkedIds(completion, homeworkTable, CONFIG.homework.week)[0] || "";
    const homeworkId = getLinkedIds(completion, homeworkTable, CONFIG.homework.homework)[0] || "";
    if (!enrollmentId || !homeworkId) continue;
    const key = buildDedupeKey(enrollmentId, weekId, homeworkId);
    if (!completionsByKey.has(key)) completionsByKey.set(key, []);
    completionsByKey.get(key).push(completion.id);
  }

  const buckets = {
    alreadyLinked: [],
    safeMatch: [],
    noEnrollment: [],
    multipleEnrollment: [],
    blockedNoHw17: [],
    missingWeek: [],
    wouldCreate: [],
    wouldUpdate: [],
    duplicateRisk: [],
  };

  for (const quiz of quizQuery.records) {
    const quizId = quiz.id;
    const enrollmentIds = getLinkedIds(quiz, quizTable, CONFIG.quiz.enrollment);
    const linkedCompletionIds = getLinkedIds(quiz, quizTable, CONFIG.quiz.homeworkCompletion);
    const processingStatus = getSelectName(quiz, quizTable, CONFIG.quiz.processingStatus);
    const score = getText(quiz, quizTable, CONFIG.quiz.score);

    const row = {
      quizId,
      quizName: quiz.name,
      enrollmentId: enrollmentIds[0] || "",
      enrollmentCount: enrollmentIds.length,
      processingStatus,
      score,
    };

    // Idempotency: already bridged to a Homework Completion.
    if (linkedCompletionIds.length > 0) {
      buckets.alreadyLinked.push({ ...row, homeworkCompletionId: linkedCompletionIds[0] });
      continue;
    }

    // Matching: rely on the Enrollment link; never guess.
    if (enrollmentIds.length === 0) {
      buckets.noEnrollment.push({ ...row, recommendedAction: "Set Enrollment on quiz row, then re-run" });
      continue;
    }
    if (enrollmentIds.length > 1) {
      buckets.multipleEnrollment.push({
        ...row,
        enrollmentIds,
        recommendedAction: "Resolve to one Enrollment, then re-run",
      });
      continue;
    }

    buckets.safeMatch.push(row);

    // HW 17 assignment must resolve to exactly one active record.
    if (!hw17ResolvedOne) {
      buckets.blockedNoHw17.push({
        ...row,
        recommendedAction: "Fix Homework Library so exactly one active HW 17 exists",
      });
      continue;
    }

    const enrollmentId = enrollmentIds[0];
    const schedule = resolvePhaWeekForEnrollment(enrollmentId);

    if (schedule.error) {
      buckets.missingWeek.push({
        ...row,
        scheduleError: schedule.error,
        matchCount: schedule.matchCount,
        weekCount: schedule.weekCount,
        recommendedAction:
          "Create exactly one active PHA for HW17 (PI + Grade Band + HW1 slot) with one Week",
      });
      continue;
    }

    const hw17WeekId = schedule.hw17WeekId;
    const key = buildDedupeKey(enrollmentId, hw17WeekId, hw17Id);
    const existing = completionsByKey.get(key) || [];

    if (existing.length === 0) {
      buckets.wouldCreate.push({
        ...row,
        dedupeKey: key,
        plannedHomeworkId: hw17Id,
        plannedWeekId: hw17WeekId,
        plannedCompletionStatus: "Submitted",
        plannedReviewStatus: "Ready for Review",
      });
    } else {
      buckets.wouldUpdate.push({
        ...row,
        dedupeKey: key,
        existingHomeworkCompletionId: existing[0],
        existingMatchCount: existing.length,
      });
      if (existing.length > 1) {
        buckets.duplicateRisk.push({
          ...row,
          dedupeKey: key,
          existingHomeworkCompletionIds: existing,
          recommendedAction: "Multiple completions share this Enrollment+Week+HW17 key; dedupe manually",
        });
      }
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: true,

    hw17: {
      activeRecordsFound: hw17Records.length,
      resolvedToSingleRecord: hw17ResolvedOne,
      hw17RecordId: hw17Id,
      hw17Title: hw17Record
        ? getText(hw17Record, homeworkLibraryTable, CONFIG.homeworkLibrary.title)
        : "",
      scheduleSource: "Program Homework Assignments per Enrollment (HW1 slot)",
    },

    totals: {
      totalQuizSubmissions: quizQuery.records.length,
      alreadyLinkedToCompletion: buckets.alreadyLinked.length,
      safeEnrollmentMatch: buckets.safeMatch.length,
      noEnrollmentMatch: buckets.noEnrollment.length,
      multipleEnrollmentMatches: buckets.multipleEnrollment.length,
      hw17AssignmentFound: hw17ResolvedOne ? "yes" : "no",
      blockedMissingHw17: buckets.blockedNoHw17.length,
      missingWeek: buckets.missingWeek.length,
      wouldCreateCompletions: buckets.wouldCreate.length,
      wouldUpdateCompletions: buckets.wouldUpdate.length,
      duplicateRiskCount: buckets.duplicateRisk.length,
      needingManualReview:
        buckets.noEnrollment.length +
        buckets.multipleEnrollment.length +
        buckets.blockedNoHw17.length +
        buckets.missingWeek.length +
        buckets.duplicateRisk.length,
    },

    preview: {
      wouldCreate: buckets.wouldCreate.slice(0, PREVIEW_LIMIT),
      wouldUpdate: buckets.wouldUpdate.slice(0, PREVIEW_LIMIT),
    },

    reviewSamples: {
      noEnrollment: buckets.noEnrollment.slice(0, SAMPLE_LIMIT),
      multipleEnrollment: buckets.multipleEnrollment.slice(0, SAMPLE_LIMIT),
      blockedMissingHw17: buckets.blockedNoHw17.slice(0, SAMPLE_LIMIT),
      missingWeek: buckets.missingWeek.slice(0, SAMPLE_LIMIT),
      duplicateRisk: buckets.duplicateRisk.slice(0, SAMPLE_LIMIT),
    },
  };

  console.log("===== HOMEWORK 17 REFLECTION QUIZ PIPELINE AUDIT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
