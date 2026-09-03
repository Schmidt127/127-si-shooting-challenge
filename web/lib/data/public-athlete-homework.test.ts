import { describe, expect, it } from "vitest";

import {
  buildPublicHomeworkAssignments,
  buildWeekMetaIndex,
  completionStatusLabel,
  indexCompletionsByPhaId,
  mapCompletionStatus,
  phaMatchesEnrollmentGradeBand,
  resolveAssignmentDescription,
  resolveAssignmentDisplayName,
  resolveAssignmentDueDateKey,
  resolveHomeworkCreditEligibility,
  resolveViewSubmittedHomeworkHref,
} from "@/lib/data/public-athlete-homework";

const GRADE_3_4 = "reclWDQZzKbVBtdhG";
const GRADE_5_6 = "recv9aWnHanY2sRgk";
const HOMEWORK_ID = "rechVLOeyEVIqmy2v";
const WEEK_1 = "recWeek000000001";
const WEEK_2 = "recWeek000000002";
const TODAY = "2026-08-24";

function pha(
  id: string,
  weekId: string,
  gradeBandIds: string[],
  active = true,
  slot: "HW1" | "HW2" = "HW1",
) {
  return {
    id,
    fields: {
      "Homework Assignment": [HOMEWORK_ID],
      Week: [weekId],
      "Grade Band": gradeBandIds.map((gradeId) => ({ id: gradeId })),
      "Homework Slot": { name: slot },
      "Active?": active,
    },
  };
}

function library(displayName: string, order = 1, assignmentNumber = 1) {
  return {
    "Assignment Full Name - Display": displayName,
    "Assignment Full Name": `SA - ${displayName}`,
    "Homework Number": "HW1",
    Order: order,
    "Assignment Number": assignmentNumber,
  };
}

const weekById = buildWeekMetaIndex([
  { id: WEEK_1, fields: { "Week Name": "Week 1", "Start Date": "2026-06-01", "End Date": "2026-06-07" } },
  { id: WEEK_2, fields: { "Week Name": "Week 2", "Start Date": "2026-06-08", "End Date": "2026-06-14" } },
]);

describe("buildPublicHomeworkAssignments", () => {
  it("returns dynamic counts without a hardcoded cap (4, 14, 18)", () => {
    for (const count of [4, 14, 18]) {
      const rows = buildPublicHomeworkAssignments({
        phaRecords: Array.from({ length: count }, (_, index) =>
          pha(`recPha${String(index).padStart(14, "0")}`, WEEK_1, [GRADE_3_4]),
        ),
        libraryById: new Map([[HOMEWORK_ID, library(`Assignment ${count}`)]]),
        weekById,
        completionsByPhaId: new Map(),
        enrollmentGradeBandId: GRADE_3_4,
      });
      expect(rows).toHaveLength(count);
    }
  });

  it("excludes inactive PHA rows and prior-year scope via Active? gate", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [
        pha("recActive00000001", WEEK_1, [GRADE_3_4], true),
        pha("recInactive0000001", WEEK_1, [GRADE_3_4], false),
      ],
      libraryById: new Map([[HOMEWORK_ID, library("Active Assignment")]]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows).toHaveLength(1);
  });

  it("filters to the athlete enrollment grade band", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [
        pha("recPha0000000001", WEEK_1, [GRADE_3_4]),
        pha("recPha0000000002", WEEK_1, [GRADE_5_6]),
      ],
      libraryById: new Map([[HOMEWORK_ID, library("Grade Band Assignment")]]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows).toHaveLength(1);
  });

  it("includes assignment description when library provides Brief Description", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha("recPha0000000001", WEEK_1, [GRADE_3_4])],
      libraryById: new Map([
        [
          HOMEWORK_ID,
          {
            ...library("Form Shooting Basics"),
            "Brief Description - Display": "Film 50 form shots and submit your clip.",
          },
        ],
      ]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows[0]?.assignmentName).toBe("Form Shooting Basics");
    expect(rows[0]?.description).toBe("Film 50 form shots and submit your clip.");
  });

  it("keeps description null when library instructions are blank", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha("recPha0000000001", WEEK_1, [GRADE_3_4])],
      libraryById: new Map([[HOMEWORK_ID, library("No Description Assignment")]]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows[0]?.description).toBeNull();
  });

  it("uses assignment display name as the primary label, not Homework Number", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha("recPha0000000001", WEEK_1, [GRADE_3_4])],
      libraryById: new Map([
        [
          HOMEWORK_ID,
          {
            ...library("Shot Tracker Usage"),
            "Homework Number": "HW99",
          },
        ],
      ]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows[0]?.assignmentName).toBe("Shot Tracker Usage");
    expect(rows[0]?.assignmentName).not.toMatch(/HW99/);
  });

  it("sorts by week start date, slot, order, and assignment name", () => {
    const hwB = "recHomework0000002";
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [
        {
          id: "recPha0000000002",
          fields: {
            "Homework Assignment": [hwB],
            Week: [WEEK_2],
            "Grade Band": [{ id: GRADE_3_4 }],
            "Homework Slot": { name: "HW2" },
            "Active?": true,
          },
        },
        pha("recPha0000000001", WEEK_1, [GRADE_3_4], true, "HW1"),
        {
          id: "recPha0000000003",
          fields: {
            "Homework Assignment": [hwB],
            Week: [WEEK_1],
            "Grade Band": [{ id: GRADE_3_4 }],
            "Homework Slot": { name: "HW2" },
            "Active?": true,
          },
        },
      ],
      libraryById: new Map([
        [HOMEWORK_ID, library("Week One HW1", 1, 1)],
        [hwB, library("Week One HW2", 2, 2)],
      ]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows.map((row) => row.weekLabel)).toEqual(["Week 1", "Week 1", "Week 2"]);
    expect(rows[0]?.assignmentName).toBe("Week One HW1");
    expect(rows[1]?.assignmentName).toBe("Week One HW2");
  });

  it("joins completion status, XP, and coach feedback from Homework Completions", () => {
    const phaId = "recPha0000000001";
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha(phaId, WEEK_1, [GRADE_3_4])],
      libraryById: new Map([[HOMEWORK_ID, library("Joined Assignment")]]),
      weekById,
      completionsByPhaId: indexCompletionsByPhaId([
        {
          fields: {
            "Program Homework Assignment": [phaId],
            "Completion Status": { name: "Satisfactory" },
            "Satisfactory?": true,
            "Base XP Awarded": 10,
            "Extra Credit XP Awarded": 2,
            "Coach Feedback": "Great work.",
            "Submission Date": "2026-06-05",
          },
        },
      ]),
      enrollmentGradeBandId: GRADE_3_4,
      todayKey: TODAY,
    });

    expect(rows[0]).toMatchObject({
      completionStatus: "approved",
      completionStatusLabel: "Satisfactory",
      xpAwarded: 12,
      coachFeedback: null,
      submissionDate: "2026-06-05",
      creditEligible: true,
      viewSubmittedHomeworkHref: null,
    });
  });

  it("does not expose coach feedback or submission file URLs on public profiles", () => {
    const phaId = "recPha0000000001";
    const reviewerUrl =
      "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recReiXXBRtaW3lns?token=abc123";
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha(phaId, WEEK_1, [GRADE_3_4])],
      libraryById: new Map([[HOMEWORK_ID, library("Submitted Assignment")]]),
      weekById,
      completionsByPhaId: indexCompletionsByPhaId([
        {
          fields: {
            "Program Homework Assignment": [phaId],
            "Completion Status": { name: "Submitted" },
            "Coach Feedback": "Private coach note",
            "Submission Date": "2026-06-10",
            "Submission Asset: Reviewer File URL (lookup)": [
              reviewerUrl,
              "https://evil.example.com/not-allowed",
            ],
          },
        },
      ]),
      enrollmentGradeBandId: GRADE_3_4,
      todayKey: TODAY,
    });

    expect(rows[0]?.coachFeedback).toBeNull();
    expect(rows[0]?.viewSubmittedHomeworkHref).toBeNull();
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain("Private coach note");
    expect(serialized).not.toContain("token=abc123");
    expect(serialized).not.toContain("lambda-url");
  });

  it("marks late submissions as late while remaining credit-pending until graded", () => {
    const phaId = "recPha0000000001";
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha(phaId, WEEK_1, [GRADE_3_4])],
      libraryById: new Map([[HOMEWORK_ID, library("Late Assignment")]]),
      weekById,
      completionsByPhaId: indexCompletionsByPhaId([
        {
          fields: {
            "Program Homework Assignment": [phaId],
            "Completion Status": { name: "Submitted" },
            "Submission Date": "2026-06-10",
          },
        },
      ]),
      enrollmentGradeBandId: GRADE_3_4,
      todayKey: TODAY,
    });

    expect(rows[0]).toMatchObject({
      completionStatus: "submitted",
      lateSubmission: true,
      creditEligible: null,
    });
  });

  it("returns an empty list when no PHA rows match the athlete grade band", () => {
    const rows = buildPublicHomeworkAssignments({
      phaRecords: [pha("recPha0000000001", WEEK_1, [GRADE_5_6])],
      libraryById: new Map([[HOMEWORK_ID, library("Other Band")]]),
      weekById,
      completionsByPhaId: new Map(),
      enrollmentGradeBandId: GRADE_3_4,
    });

    expect(rows).toEqual([]);
  });
});

describe("resolveAssignmentDueDateKey", () => {
  it("uses Week End Date when PHA Due Date is absent", () => {
    expect(
      resolveAssignmentDueDateKey(
        {},
        { name: "Week 1", startDate: "2026-06-01", endDate: "2026-06-07", weekNumber: 1 },
      ),
    ).toBe("2026-06-07");
  });

  it("prefers explicit PHA Due Date when present", () => {
    expect(
      resolveAssignmentDueDateKey(
        { "Due Date": "2026-08-31" },
        { name: "Week 1", startDate: "2026-06-01", endDate: "2026-06-07", weekNumber: 1 },
      ),
    ).toBe("2026-08-31");
  });

  it("falls back when Due Date is missing or blank", () => {
    expect(
      resolveAssignmentDueDateKey(
        {},
        { name: "Week 1", startDate: "2026-06-01", endDate: "2026-06-07", weekNumber: 1 },
      ),
    ).toBe("2026-06-07");
    expect(
      resolveAssignmentDueDateKey(
        { "Due Date": "" },
        { name: "Week 1", startDate: "2026-06-01", endDate: "2026-06-07", weekNumber: 1 },
      ),
    ).toBe("2026-06-07");
  });

  it("does not throw on invalid Due Date values", () => {
    expect(
      resolveAssignmentDueDateKey(
        { "Due Date": "garbage-date" },
        { name: "Week 1", startDate: "2026-06-01", endDate: "2026-06-07", weekNumber: 1 },
      ),
    ).toBe("garbage-date");
  });
});

describe("resolveHomeworkCreditEligibility", () => {
  it("allows credit when automation already awarded XP despite lateness", () => {
    expect(
      resolveHomeworkCreditEligibility({
        dueDateKey: "2026-06-07",
        submissionDateKey: "2026-06-10",
        completionStatus: "approved",
        satisfactory: true,
        xpAwarded: 10,
        todayKey: TODAY,
      }),
    ).toMatchObject({ creditEligible: true, lateSubmission: true });
  });

  it("flags past-due not-started assignments as still credit-eligible when graded later", () => {
    expect(
      resolveHomeworkCreditEligibility({
        dueDateKey: "2026-06-07",
        submissionDateKey: null,
        completionStatus: "not_started",
        satisfactory: false,
        xpAwarded: 0,
        todayKey: TODAY,
      }),
    ).toMatchObject({ creditEligible: null, pastDue: true, lateSubmission: false });
  });

  it("keeps late ungraded submissions credit-pending (not ineligible)", () => {
    expect(
      resolveHomeworkCreditEligibility({
        dueDateKey: "2026-06-07",
        submissionDateKey: "2026-06-10",
        completionStatus: "submitted",
        satisfactory: false,
        xpAwarded: 0,
        todayKey: TODAY,
      }),
    ).toMatchObject({ creditEligible: null, pastDue: true, lateSubmission: true });
  });
});

describe("helpers", () => {
  it("resolveAssignmentDescription returns trimmed brief description or null", () => {
    expect(
      resolveAssignmentDescription({
        "Brief Description - Display": "  Complete the notebook page.  ",
      }),
    ).toBe("Complete the notebook page.");
    expect(resolveAssignmentDescription({})).toBeNull();
  });

  it("resolveAssignmentDisplayName prefers Assignment Title over full-name fields", () => {
    expect(
      resolveAssignmentDisplayName({
        "Assignment Title": "Mikan Drill",
        "Assignment Full Name - Display": "Display Name",
        "Assignment Full Name": "SA - Personal Game Plan - Mikan Drill",
      }),
    ).toBe("Mikan Drill");
  });

  it("resolveAssignmentDisplayName falls back to display name when title is blank", () => {
    expect(
      resolveAssignmentDisplayName({
        "Assignment Full Name - Display": "Display Name",
        "Assignment Full Name": "SA - Display Name",
      }),
    ).toBe("Display Name");
  });

  it("maps completion statuses for public labels", () => {
    expect(mapCompletionStatus({ name: "Needs Revision" })).toBe("needs_revision");
    expect(completionStatusLabel("needs_revision")).toBe("Needs revision");
  });

  it("matches grade band eligibility", () => {
    expect(phaMatchesEnrollmentGradeBand([GRADE_3_4, GRADE_5_6], GRADE_3_4)).toBe(true);
    expect(phaMatchesEnrollmentGradeBand([GRADE_5_6], GRADE_3_4)).toBe(false);
  });

  it("resolveViewSubmittedHomeworkHref accepts only lambda reviewer URLs", () => {
    const safe =
      "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/recReiXXBRtaW3lns?token=abc123";
    expect(resolveViewSubmittedHomeworkHref([safe])).toBe(safe);
    expect(
      resolveViewSubmittedHomeworkHref([
        "https://shooting-challenge-assets.s3.amazonaws.com/private/file.jpg",
        safe,
      ]),
    ).toBe(safe);
    expect(resolveViewSubmittedHomeworkHref(["https://drive.google.com/file/d/abc/view"])).toBeNull();
  });
});
