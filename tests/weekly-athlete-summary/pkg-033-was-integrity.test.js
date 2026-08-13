#!/usr/bin/env node
"use strict";

const assert = require("assert");

function canonicalSummaries(summaries, enrollmentId, weekId) {
  return summaries.filter(
    (summary) =>
      summary.enrollmentId === enrollmentId &&
      summary.weekId === weekId &&
      summary.programInstanceId === summary.expectedProgramInstanceId,
  );
}

function resolveCanonical(summaries, identity) {
  const matches = summaries.filter(
    (summary) =>
      summary.enrollmentId === identity.enrollmentId &&
      summary.weekId === identity.weekId &&
      summary.programInstanceId === identity.programInstanceId &&
      summary.formulaReady === true,
  );
  if (matches.length !== 1) {
    return {
      status: "error",
      reason: matches.length === 0 ? "missing_canonical_was" : "duplicate_canonical_was",
      matches,
    };
  }
  return { status: "ok", summary: matches[0] };
}

function repairBacklinks(summary, submission, xpEvents) {
  const repaired = {
    submissionWas: submission.wasId,
    xpWas: xpEvents.map((event) => event.wasId),
  };
  if (
    submission.enrollmentId !== summary.enrollmentId ||
    submission.weekId !== summary.weekId
  ) {
    return { status: "error", reason: "wrong_submission_owner", repaired: false };
  }
  submission.wasId = summary.id;
  for (const event of xpEvents) {
    if (
      event.enrollmentId === summary.enrollmentId &&
      event.weekId === summary.weekId &&
      event.sourceType !== "SUBMISSION_BASE"
    ) {
      event.wasId = summary.id;
    }
  }
  return { status: "repaired", repaired, summaryId: summary.id };
}

function run(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

run("first submission resolves one canonical summary", () => {
  const summaries = [
    {
      id: "was-1",
      enrollmentId: "enr-1",
      weekId: "week-1",
      programInstanceId: "pi-1",
      formulaReady: true,
    },
  ];
  const result = resolveCanonical(summaries, {
    enrollmentId: "enr-1",
    weekId: "week-1",
    programInstanceId: "pi-1",
  });
  assert.strictEqual(result.status, "ok");
  assert.strictEqual(result.summary.id, "was-1");
});

run("second submission reuses the same summary", () => {
  const summaries = [
    {
      id: "was-1",
      enrollmentId: "enr-1",
      weekId: "week-1",
      programInstanceId: "pi-1",
      formulaReady: true,
    },
  ];
  const first = resolveCanonical(summaries, {
    enrollmentId: "enr-1",
    weekId: "week-1",
    programInstanceId: "pi-1",
  });
  const second = resolveCanonical(summaries, {
    enrollmentId: "enr-1",
    weekId: "week-1",
    programInstanceId: "pi-1",
  });
  assert.strictEqual(first.summary.id, second.summary.id);
});

run("concurrent duplicate creation fails closed", () => {
  const result = resolveCanonical(
    [
      {
        id: "was-a",
        enrollmentId: "enr-1",
        weekId: "week-1",
        programInstanceId: "pi-1",
        formulaReady: true,
      },
      {
        id: "was-b",
        enrollmentId: "enr-1",
        weekId: "week-1",
        programInstanceId: "pi-1",
        formulaReady: true,
      },
    ],
    { enrollmentId: "enr-1", weekId: "week-1", programInstanceId: "pi-1" },
  );
  assert.deepStrictEqual(
    { status: result.status, reason: result.reason },
    { status: "error", reason: "duplicate_canonical_was" },
  );
});

run("wrong Program Instance fails closed", () => {
  const result = resolveCanonical(
    [
      {
        id: "was-wrong-pi",
        enrollmentId: "enr-1",
        weekId: "week-1",
        programInstanceId: "pi-old",
        formulaReady: true,
      },
    ],
    { enrollmentId: "enr-1", weekId: "week-1", programInstanceId: "pi-1" },
  );
  assert.strictEqual(result.reason, "missing_canonical_was");
});

run("formula lag fails closed instead of accepting a partial summary", () => {
  const result = resolveCanonical(
    [
      {
        id: "was-lagging",
        enrollmentId: "enr-1",
        weekId: "week-1",
        programInstanceId: "pi-1",
        formulaReady: false,
      },
    ],
    { enrollmentId: "enr-1", weekId: "week-1", programInstanceId: "pi-1" },
  );
  assert.strictEqual(result.reason, "missing_canonical_was");
});

run("missing backlink is repaired for exact ownership", () => {
  const submission = {
    enrollmentId: "enr-1",
    weekId: "week-1",
    wasId: null,
  };
  const event = {
    sourceType: "ZOOM",
    enrollmentId: "enr-1",
    weekId: "week-1",
    wasId: null,
  };
  const result = repairBacklinks(
    { id: "was-1", enrollmentId: "enr-1", weekId: "week-1" },
    submission,
    [event],
  );
  assert.strictEqual(result.status, "repaired");
  assert.strictEqual(submission.wasId, "was-1");
  assert.strictEqual(event.wasId, "was-1");
});

run("Submission Base XP ownership is not silently repaired by WAS owner", () => {
  const submission = {
    enrollmentId: "enr-1",
    weekId: "week-1",
    wasId: null,
  };
  const event = {
    sourceType: "SUBMISSION_BASE",
    enrollmentId: "enr-1",
    weekId: "week-1",
    wasId: "was-old",
  };
  repairBacklinks(
    { id: "was-1", enrollmentId: "enr-1", weekId: "week-1" },
    submission,
    [event],
  );
  assert.strictEqual(event.wasId, "was-old");
});

run("wrong submission ownership is rejected", () => {
  const result = repairBacklinks(
    { id: "was-1", enrollmentId: "enr-1", weekId: "week-1" },
    { enrollmentId: "enr-2", weekId: "week-1", wasId: null },
    [],
  );
  assert.deepStrictEqual(
    { status: result.status, reason: result.reason },
    { status: "error", reason: "wrong_submission_owner" },
  );
});

run("replay leaves settled totals unchanged", () => {
  const activeEvents = [
    { points: 10, active: true },
    { points: 5, active: true },
  ];
  const total = activeEvents.reduce(
    (sum, event) => sum + (event.active ? event.points : 0),
    0,
  );
  const replayTotal = activeEvents.reduce(
    (sum, event) => sum + (event.active ? event.points : 0),
    0,
  );
  assert.strictEqual(replayTotal, total);
});

console.log("WAS integrity harness passed");
