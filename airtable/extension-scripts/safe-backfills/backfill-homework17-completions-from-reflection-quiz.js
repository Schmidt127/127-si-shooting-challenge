/*
Extension Script: Backfill Homework 17 Completions From Reflection Quiz (Fillout intake)
System: 127 SI Shooting Challenge
Purpose:
  One-time backfill that links or creates ONE normal Homework Completion for each
  existing Final Reflection Quiz Submissions row (the Fillout Homework 17 test), so
  Homework 17 flows through the same grading / satisfactory / feedback / XP pipeline
  as all other homework.

  This is the same logic deployed as automation 067 for future submissions.

Design:
  - Source of truth stays the Homework Completion. The quiz row is intake only.
  - Native dedupe key: Enrollment | Week | Homework (mirrors Homework Completion Key).
  - Matching: uses the Enrollment link on the quiz row only. If missing/ambiguous,
    the row is flagged Needs Review and skipped (never guesses the child).
  - Week: taken from the single active HW 17 record in FBC Curriculum - SYNC.
  - New completions are created as Completion Status = Submitted,
    Review Status = Ready for Review. Satisfactory? / Review Complete / Coach Feedback
    are left untouched so the normal coach review + 064/065 XP pipeline runs.
  - NEVER creates or modifies XP Events. NEVER marks Satisfactory / awards XP.
  - Only touches HW 17 quiz-sourced records and their matching completion.

Safety:
  - DRY_RUN defaults to true (report only)
  - Set CONFIRM_WRITE = true to apply creates/updates
  - BATCH_LIMIT caps create/link writes per run (default 25); re-run until remainingCount is 0
  - MARK_REVIEW_STATUS toggles writing Processing Status = Needs Review / Error on
    quiz rows that cannot be processed (only when CONFIRM_WRITE)

Setup:
  1. Run audits/audit-homework17-reflection-quiz-pipeline.js and review the preview
  2. Run this script with DRY_RUN = true; review candidateCount and sample
  3. Set DRY_RUN = false and CONFIRM_WRITE = true; re-run until remainingCount is 0
  4. Re-run the audit to confirm wouldCreate / wouldUpdate are 0
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const MARK_REVIEW_STATUS = true;

const CONFIG = {
  scriptName: "backfill-homework17-completions-from-reflection-quiz",
  version: "v1.0",

  tables: {
    quiz: "Final Reflection Quiz Submissions",
    homework: "Homework Completions",
    curriculum: "FBC Curriculum - SYNC",
    enrollments: "Enrollments",
  },

  quiz: {
    enrollment: "Enrollment",
    homeworkCompletion: "Homework Completion",
    submittedAt: "Submitted At",
    processingStatus: "Processing Status",
    processingError: "Processing Error",
  },

  homework: {
    enrollment: "Enrollment",
    homework: "Homework",
    week: "Week",
    gradeBand: "Grade Band",
    finalQuiz: "Final Reflection Quiz Submissions",
    sourceSystem: "Source System",
    itemType: "Item Type",
    completionStatus: "Completion Status",
    reviewStatus: "Review Status",
    submissionDate: "Submission Date",
  },

  curriculum: {
    homeworkNumber: "Homework Number",
    active: "Active?",
    week: "Week",
  },

  enrollments: {
    gradeBand: "Grade Band",
  },

  values: {
    homeworkNumber17: "HW 17",
    sourceSystemFillout: "Fillout",
    itemTypeHomework: "Homework",
    completionStatusSubmitted: "Submitted",
    reviewStatusReady: "Ready for Review",
    processingProcessed: "Processed",
    processingNeedsReview: "Needs Review",
    processingError: "Error",
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

function isWritableField(table, fieldName) {
  if (!fieldExists(table, fieldName)) return false;
  try {
    return table.getField(fieldName).isComputed !== true;
  } catch {
    return false;
  }
}

function getSelectName(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  return raw?.name ? String(raw.name).trim() : "";
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

function getDateValue(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;
  const value = record.getCellValue(fieldName);
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function linkedCell(ids) {
  return [...new Set((ids || []).filter(Boolean))].map(id => ({ id }));
}

function buildCellValueForField(table, fieldName, value) {
  const field = table.getField(fieldName);
  if (field.type === "singleSelect") return { name: value };
  if (field.type === "multipleSelects") return [{ name: value }];
  return value;
}

function hasSingleSelectChoice(table, fieldName, choiceName) {
  if (!fieldExists(table, fieldName)) return false;
  const field = table.getField(fieldName);
  if (field.type !== "singleSelect") return true;
  return (field.options?.choices || []).some(choice => choice.name === choiceName);
}

function setSelectSafe(fields, table, fieldName, choiceName) {
  if (!isWritableField(table, fieldName)) return;
  if (!hasSingleSelectChoice(table, fieldName, choiceName)) return;
  fields[fieldName] = buildCellValueForField(table, fieldName, choiceName);
}

function setLinkSafe(fields, table, fieldName, ids) {
  if (!isWritableField(table, fieldName)) return;
  const cell = linkedCell(ids);
  if (cell.length === 0) return;
  fields[fieldName] = cell;
}

function setDateSafe(fields, table, fieldName, value) {
  if (!isWritableField(table, fieldName) || !value) return;
  fields[fieldName] = value;
}

function buildDedupeKey(enrollmentId, weekId, homeworkId) {
  return `${enrollmentId || ""}|${weekId || ""}|${homeworkId || ""}`;
}

async function main() {
  const quizTable = base.getTable(CONFIG.tables.quiz);
  const homeworkTable = base.getTable(CONFIG.tables.homework);
  const curriculumTable = base.getTable(CONFIG.tables.curriculum);
  const enrollmentsTable = base.getTable(CONFIG.tables.enrollments);

  const quizFields = Object.values(CONFIG.quiz).filter(name => fieldExists(quizTable, name));
  const homeworkFields = Object.values(CONFIG.homework).filter(name => fieldExists(homeworkTable, name));
  const curriculumFields = Object.values(CONFIG.curriculum).filter(name => fieldExists(curriculumTable, name));
  const enrollmentFields = Object.values(CONFIG.enrollments).filter(name => fieldExists(enrollmentsTable, name));

  const [quizQuery, homeworkQuery, curriculumQuery, enrollmentQuery] = await Promise.all([
    quizTable.selectRecordsAsync({ fields: quizFields }),
    homeworkTable.selectRecordsAsync({ fields: homeworkFields }),
    curriculumTable.selectRecordsAsync({ fields: curriculumFields }),
    enrollmentsTable.selectRecordsAsync({ fields: enrollmentFields }),
  ]);

  // Resolve the single active HW 17 curriculum record + its Week.
  const hw17Records = curriculumQuery.records.filter(record => {
    const number = getSelectName(record, curriculumTable, CONFIG.curriculum.homeworkNumber);
    const active = getBooleanish(record, curriculumTable, CONFIG.curriculum.active);
    return number === CONFIG.values.homeworkNumber17 && active;
  });

  if (hw17Records.length !== 1) {
    console.log("===== BACKFILL HOMEWORK 17 COMPLETIONS — ABORTED =====");
    console.log(JSON.stringify({
      script: CONFIG.scriptName,
      version: CONFIG.version,
      error: `Expected exactly one active HW 17 record in FBC Curriculum - SYNC, found ${hw17Records.length}.`,
      recommendedAction: "Fix the curriculum so exactly one active HW 17 exists, then re-run.",
    }, null, 2));
    return;
  }

  const hw17Record = hw17Records[0];
  const hw17Id = hw17Record.id;
  const hw17WeekIds = getLinkedIds(hw17Record, curriculumTable, CONFIG.curriculum.week);

  if (hw17WeekIds.length !== 1) {
    console.log("===== BACKFILL HOMEWORK 17 COMPLETIONS — ABORTED =====");
    console.log(JSON.stringify({
      script: CONFIG.scriptName,
      version: CONFIG.version,
      error: `Expected exactly one Week linked to HW 17, found ${hw17WeekIds.length}.`,
      recommendedAction: "Link exactly one Week to the HW 17 curriculum record, then re-run.",
    }, null, 2));
    return;
  }

  const hw17WeekId = hw17WeekIds[0];

  // Index existing completions by Enrollment|Week|Homework, and grade band by enrollment.
  const completionsByKey = new Map();
  for (const completion of homeworkQuery.records) {
    const enrollmentId = getLinkedIds(completion, homeworkTable, CONFIG.homework.enrollment)[0] || "";
    const weekId = getLinkedIds(completion, homeworkTable, CONFIG.homework.week)[0] || "";
    const homeworkId = getLinkedIds(completion, homeworkTable, CONFIG.homework.homework)[0] || "";
    if (!enrollmentId || !homeworkId) continue;
    const key = buildDedupeKey(enrollmentId, weekId, homeworkId);
    if (!completionsByKey.has(key)) completionsByKey.set(key, []);
    completionsByKey.get(key).push(completion);
  }

  const gradeBandByEnrollment = new Map();
  for (const enrollment of enrollmentQuery.records) {
    const gradeBandId = getLinkedIds(enrollment, enrollmentsTable, CONFIG.enrollments.gradeBand)[0] || "";
    if (gradeBandId) gradeBandByEnrollment.set(enrollment.id, gradeBandId);
  }

  const candidates = [];
  const reviewMarks = [];
  const skipCounts = {};

  function countSkip(reason) {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
  }

  for (const quiz of quizQuery.records) {
    const quizId = quiz.id;
    const enrollmentIds = getLinkedIds(quiz, quizTable, CONFIG.quiz.enrollment);
    const linkedCompletionIds = getLinkedIds(quiz, quizTable, CONFIG.quiz.homeworkCompletion);

    if (linkedCompletionIds.length > 0) {
      countSkip("already_linked");
      continue;
    }

    if (enrollmentIds.length === 0) {
      countSkip("needs_review_no_enrollment");
      reviewMarks.push({ quizId, quizName: quiz.name, status: CONFIG.values.processingNeedsReview, note: "No Enrollment linked on quiz row." });
      continue;
    }
    if (enrollmentIds.length > 1) {
      countSkip("needs_review_multiple_enrollment");
      reviewMarks.push({ quizId, quizName: quiz.name, status: CONFIG.values.processingNeedsReview, note: `Multiple Enrollments linked: ${enrollmentIds.join(", ")}` });
      continue;
    }

    const enrollmentId = enrollmentIds[0];
    const key = buildDedupeKey(enrollmentId, hw17WeekId, hw17Id);
    const existing = completionsByKey.get(key) || [];
    const submittedAt = getDateValue(quiz, quizTable, CONFIG.quiz.submittedAt);

    if (existing.length === 0) {
      candidates.push({
        action: "create",
        quizId,
        quizName: quiz.name,
        enrollmentId,
        gradeBandId: gradeBandByEnrollment.get(enrollmentId) || "",
        submittedAt,
        dedupeKey: key,
      });
    } else {
      // Link the quiz to the existing completion (prefer one already linked to a quiz).
      const target = existing[0];
      candidates.push({
        action: "link",
        quizId,
        quizName: quiz.name,
        enrollmentId,
        existingCompletionId: target.id,
        existingMatchCount: existing.length,
        existingSourceSystem: getSelectName(target, homeworkTable, CONFIG.homework.sourceSystem),
        existingQuizIds: getLinkedIds(target, homeworkTable, CONFIG.homework.finalQuiz),
        dedupeKey: key,
      });
    }
  }

  const batch = candidates.slice(0, BATCH_LIMIT);
  const applied = [];
  const errors = [];

  for (const row of batch) {
    try {
      if (row.action === "create") {
        const createFields = {};
        setLinkSafe(createFields, homeworkTable, CONFIG.homework.enrollment, [row.enrollmentId]);
        setLinkSafe(createFields, homeworkTable, CONFIG.homework.homework, [hw17Id]);
        setLinkSafe(createFields, homeworkTable, CONFIG.homework.week, [hw17WeekId]);
        if (row.gradeBandId) {
          setLinkSafe(createFields, homeworkTable, CONFIG.homework.gradeBand, [row.gradeBandId]);
        }
        setLinkSafe(createFields, homeworkTable, CONFIG.homework.finalQuiz, [row.quizId]);
        setSelectSafe(createFields, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
        setSelectSafe(createFields, homeworkTable, CONFIG.homework.itemType, CONFIG.values.itemTypeHomework);
        setSelectSafe(createFields, homeworkTable, CONFIG.homework.completionStatus, CONFIG.values.completionStatusSubmitted);
        setSelectSafe(createFields, homeworkTable, CONFIG.homework.reviewStatus, CONFIG.values.reviewStatusReady);
        setDateSafe(createFields, homeworkTable, CONFIG.homework.submissionDate, row.submittedAt);

        let completionId = "(planned)";
        if (!DRY_RUN && CONFIRM_WRITE) {
          completionId = await homeworkTable.createRecordAsync(createFields);
          const quizUpdate = {};
          setLinkSafe(quizUpdate, quizTable, CONFIG.quiz.homeworkCompletion, [completionId]);
          setSelectSafe(quizUpdate, quizTable, CONFIG.quiz.processingStatus, CONFIG.values.processingProcessed);
          if (Object.keys(quizUpdate).length) {
            await quizTable.updateRecordAsync(row.quizId, quizUpdate);
          }
        }
        applied.push({ ...row, homeworkCompletionId: completionId });
      } else {
        // action === "link"
        if (!DRY_RUN && CONFIRM_WRITE) {
          const completionUpdate = {};
          const mergedQuizIds = [...new Set([...(row.existingQuizIds || []), row.quizId])];
          setLinkSafe(completionUpdate, homeworkTable, CONFIG.homework.finalQuiz, mergedQuizIds);
          if (!row.existingSourceSystem) {
            setSelectSafe(completionUpdate, homeworkTable, CONFIG.homework.sourceSystem, CONFIG.values.sourceSystemFillout);
          }
          if (Object.keys(completionUpdate).length) {
            await homeworkTable.updateRecordAsync(row.existingCompletionId, completionUpdate);
          }
          const quizUpdate = {};
          setLinkSafe(quizUpdate, quizTable, CONFIG.quiz.homeworkCompletion, [row.existingCompletionId]);
          setSelectSafe(quizUpdate, quizTable, CONFIG.quiz.processingStatus, CONFIG.values.processingProcessed);
          if (Object.keys(quizUpdate).length) {
            await quizTable.updateRecordAsync(row.quizId, quizUpdate);
          }
        }
        applied.push({ ...row, homeworkCompletionId: row.existingCompletionId });
      }
    } catch (error) {
      errors.push({
        quizId: row.quizId,
        action: row.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Optionally flag rows that cannot be processed (quiz-row writes only).
  let reviewMarksApplied = 0;
  if (MARK_REVIEW_STATUS && !DRY_RUN && CONFIRM_WRITE) {
    for (const mark of reviewMarks.slice(0, BATCH_LIMIT)) {
      try {
        const quizUpdate = {};
        setSelectSafe(quizUpdate, quizTable, CONFIG.quiz.processingStatus, mark.status);
        if (isWritableField(quizTable, CONFIG.quiz.processingError)) {
          quizUpdate[CONFIG.quiz.processingError] = mark.note;
        }
        if (Object.keys(quizUpdate).length) {
          await quizTable.updateRecordAsync(mark.quizId, quizUpdate);
          reviewMarksApplied += 1;
        }
      } catch (error) {
        errors.push({
          quizId: mark.quizId,
          action: "mark_review",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    dryRun: DRY_RUN,
    confirmWrite: CONFIRM_WRITE,
    batchLimit: BATCH_LIMIT,

    hw17RecordId: hw17Id,
    hw17WeekId,

    candidateCount: candidates.length,
    batchCount: batch.length,
    appliedCount: DRY_RUN || !CONFIRM_WRITE ? 0 : applied.length,
    remainingCount: Math.max(0, candidates.length - batch.length),

    actionCounts: candidates.reduce((acc, row) => {
      acc[row.action] = (acc[row.action] || 0) + 1;
      return acc;
    }, {}),

    skipCounts,
    reviewMarkCount: reviewMarks.length,
    reviewMarksApplied,
    errors,

    sample: applied.slice(0, 15),
    reviewSample: reviewMarks.slice(0, 15),
  };

  console.log("===== BACKFILL HOMEWORK 17 COMPLETIONS FROM REFLECTION QUIZ =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
