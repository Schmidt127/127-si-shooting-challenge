/**
 * SC-159 — Boolean contract for 059 Lifecycle Trigger? formula
 *
 * Mirrors the approved Airtable formula in
 * docs/deploy-checklists/059-sc159-lifecycle-formula-trigger.md
 *
 * IF(
 *   OR(
 *     AND(XP Award Status = "Pending", Active?),
 *     AND(NOT(Active?), Shot Milestone, XP Award Status = "Awarded")
 *   ),
 *   1, 0
 * )
 */

function lifecycleTrigger({ xpAwardStatus, active, hasShotMilestone }) {
  const awardRestore =
    xpAwardStatus === "Pending" && active === true;
  const withdraw =
    active === false &&
    hasShotMilestone === true &&
    xpAwardStatus === "Awarded";
  return awardRestore || withdraw ? 1 : 0;
}

function assert(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
}

const cases = [
  {
    name: "Perfect Week Pending+Active (no SM)",
    input: { xpAwardStatus: "Pending", active: true, hasShotMilestone: false },
    expected: 1,
  },
  {
    name: "Shot Milestone Pending+Active",
    input: { xpAwardStatus: "Pending", active: true, hasShotMilestone: true },
    expected: 1,
  },
  {
    name: "Awarded+Active settled award",
    input: { xpAwardStatus: "Awarded", active: true, hasShotMilestone: true },
    expected: 0,
  },
  {
    name: "Awarded+inactive SM withdrawal needed",
    input: { xpAwardStatus: "Awarded", active: false, hasShotMilestone: true },
    expected: 1,
  },
  {
    name: "Skipped+inactive after withdraw settle",
    input: { xpAwardStatus: "Skipped", active: false, hasShotMilestone: true },
    expected: 0,
  },
  {
    name: "Inactive SM still Pending (not withdraw gate)",
    input: { xpAwardStatus: "Pending", active: false, hasShotMilestone: true },
    expected: 0,
  },
  {
    name: "Inactive Perfect Week Awarded (no SM) — no withdraw branch",
    input: { xpAwardStatus: "Awarded", active: false, hasShotMilestone: false },
    expected: 0,
  },
  {
    name: "Error+Active should not award-path without Pending",
    input: { xpAwardStatus: "Error", active: true, hasShotMilestone: true },
    expected: 0,
  },
];

for (const c of cases) {
  assert(c.name, lifecycleTrigger(c.input), c.expected);
}

// Forbidden flatten check: four-way OR would incorrectly fire on Active-only
function forbiddenFlatOr({ xpAwardStatus, active, hasShotMilestone }) {
  return (
    xpAwardStatus === "Pending" ||
    active === true ||
    active === false ||
    hasShotMilestone === true
  )
    ? 1
    : 0;
}
assert(
  "forbidden flat OR must not match settled Awarded+Active as 'safe'",
  forbiddenFlatOr({
    xpAwardStatus: "Awarded",
    active: true,
    hasShotMilestone: false,
  }),
  1
);
assert(
  "correct formula keeps settled Awarded+Active at 0",
  lifecycleTrigger({
    xpAwardStatus: "Awarded",
    active: true,
    hasShotMilestone: false,
  }),
  0
);

console.log(`059-lifecycle-trigger-formula: ${cases.length} cases + flatten guard PASS`);
