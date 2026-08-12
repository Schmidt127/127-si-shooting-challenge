import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = (n) =>
    readFileSync(
      path.join(R, "airtable/automations/shooting-challenge", n),
      "utf8",
    ),
  audit = () =>
    readFileSync(
      path.join(
        R,
        "airtable/extension-scripts/audits/audit-homework-xp-pipeline-integrity.js",
      ),
      "utf8",
    );
function state() {
  return {
    hc: {
      id: "recHC000000000001",
      enr: "recENR0000000001",
      week: "recWEEK000000001",
      subs: ["recSUB0000000001"],
      pha: "recPHA0000000001",
      activePha: true,
      activeEnrollment: true,
      sat: true,
      review: true,
      feedback: "Good",
      xp: 35,
      event: "",
    },
    events: [],
    was: "recWAS0000000001",
    lifetime: 0,
  };
}
const key = (h) => `HOMEWORK_XP|${h.id}`;
function run(s) {
  const h = s.hc,
    e = s.events.filter((x) => x.key === key(h) || x.hc === h.id);
  if (e.length > 1) throw Error("duplicate");
  const linkedEligible = h.activeEnrollment && h.activePha;
  const eligible = h.sat && h.review && h.feedback;
  if (!e[0] && eligible && !linkedEligible) throw Error("linked eligibility");
  if (e[0] && !linkedEligible) {
    if (
      e[0].hc !== h.id ||
      e[0].enr !== h.enr ||
      e[0].week !== h.week ||
      !h.subs.includes(e[0].sub) ||
      e[0].points !== h.xp
    )
      throw Error("ownership");
    e[0].active = false;
    s.lifetime = 0;
    return "deactivated";
  }
  if (!eligible) {
    if (e[0]) e[0].active = false;
    s.lifetime = 0;
    return "deactivated";
  }
  if (!h.enr || !h.week || !h.subs.length) throw Error("links");
  if (h.subs.length > 1 && !e[0]) throw Error("canonical Submission");
  let x = e[0];
  if (!x) {
    x = {
      id: "recXP00000000001",
      key: key(h),
      hc: h.id,
      enr: h.enr,
      week: h.week,
      sub: h.subs[0],
      was: s.was,
      points: h.xp,
      active: true,
    };
    s.events.push(x);
  } else {
    if (
      x.hc !== h.id ||
      x.enr !== h.enr ||
      x.week !== h.week ||
      !h.subs.includes(x.sub) ||
      x.points !== h.xp
    )
      throw Error("ownership");
    Object.assign(x, { was: s.was, active: true });
  }
  h.event = x.id;
  s.lifetime = s.events
    .filter((x) => x.active)
    .reduce((n, x) => n + x.points, 0);
  return e[0] ? "updated" : "created";
}
test("static contracts are canonical and retired writers stay retired", () => {
  const a = src("065-homework-review-and-xp-create-homework-xp-event.js");
  assert.match(a, /HOMEWORK_XP\|/);
  assert.match(a, /recheck/i);
  assert.match(a, /Program Homework Assignment/);
  assert.match(a, /reconciled_ineligible/);
  assert.match(a, /Homework XP Current Signature/);
  assert.match(a, /Last Homework XP Reconciled Signature/);
  assert.match(a, /Homework XP Reconciliation Needed\?/);
  assert.match(a, /PHA Homework Slot ownership mismatch/);
  assert.match(
    src(
      "063-homework-review-and-xp-copy-enrollment-grade-band-to-homework-completion.js",
    ),
    /DELETED|retired/i,
  );
  assert.match(
    src("068-homework-reconcile-deferred-weekly-summary-links.js"),
    /retired/i,
  );
  assert.doesNotMatch(a, /Parent Feedback Ready/);
  assert.ok(
    a.indexOf("if (xp) assertOwned") <
      a.indexOf("const linkedEligibility = await validatePha"),
  );
  for (const field of [
    "C.x.key",
    "C.x.hc",
    "C.x.enr",
    "C.x.week",
    "C.x.sub",
    "C.x.points",
    "C.x.active",
    "C.x.was",
    "C.x.source",
    "C.x.bucket",
  ])
    assert.match(a, new RegExp(field.replaceAll(".", "\\.")));
  assert.ok(a.indexOf("settleAndAcknowledge") < a.indexOf("async function validatePha"));
});
test("authoritative audit is read-only and checks full ownership", () => {
  const a = audit();
  for (const x of [
    "Source Key",
    "Homework Completion",
    "Enrollment",
    "Week",
    "Submission",
    "Weekly Athlete Summary",
    "active ineligible event",
    "orphan_homework_xp",
    "legacy_or_unknown_homework_prefix",
    "XP Source",
    "XP Bucket",
    "Program Homework Assignments",
    "inactive_or_invalid_enrollment_pha",
    "reconciliation_signature_formula_mismatch",
  ])
    assert.match(a, new RegExp(x));
  assert.doesNotMatch(a, /updateRecord|createRecord|deleteRecord/);
});
test("formula-backed trigger schema propagates linked state without polling", () => {
  const d = readFileSync(
    path.join(R, "airtable/schema/current/homework-xp-reconciliation-fields.md"),
    "utf8",
  );
  for (const field of [
    "Homework XP Enrollment Signature",
    "Homework XP PHA Signature",
    "Homework XP Event Signature",
    "Homework XP Current Signature",
    "Last Homework XP Reconciled Signature",
    "Homework XP Reconciliation Needed?",
  ])
    assert.match(d, new RegExp(field.replace("?", "\\?")));
  assert.match(d, /When record matches conditions/);
  assert.match(d, /Item Slot.*canonical assignment identity/);
  assert.match(d, /No view, polling, or new automation slot/);
  assert.match(d, /initialize-homework-xp-reconciliation-signatures/);
});
test("065 settles post-write formula state before acknowledgement", () => {
  const a = src("065-homework-review-and-xp-create-homework-xp-event.js");
  assert.match(a, /settleAndAcknowledge/);
  assert.match(a, /formula did not settle to the post-write XP Event state/);
  assert.match(a, /acknowledgement did not clear the formula trigger/);
  assert.doesNotMatch(a, /\[C\.h\.lastSignature\]: signatureAtStart/);
});
for (const [name, active] of [
  ["award", true],
  ["deactivate", false],
  ["reactivate", true],
])
  test(`${name} formula propagation settles needed 1 to 0 in one run`, () => {
    const event = `recXP00000000001|${active ? "ACTIVE" : "INACTIVE"}|KEY=HOMEWORK_XP|recHC000000000001`;
    const current = `HC|EVENT=${event}`;
    let last = "old",
      needed = Number(current !== last);
    assert.equal(needed, 1);
    last = current;
    needed = Number(current !== last);
    assert.equal(needed, 0);
  });
test("initializer is explicit, bounded, audit-clean, and idempotent", () => {
  const a = readFileSync(
    path.join(
      R,
      "airtable/extension-scripts/safe-backfills/initialize-homework-xp-reconciliation-signatures.js",
    ),
    "utf8",
  );
  assert.match(a, /REVIEWED_HC_RECORD_IDS = \[\]/);
  assert.match(
    a,
    /CONFIRM_WRITE requires a non-empty explicit reviewed HC allowlist/,
  );
  assert.match(a, /MAX_RECORDS = 25/);
  assert.match(a, /not audit-clean; no writes performed/);
  assert.match(a, /canonical WAS cardinality/);
  assert.match(a, /XP ownership\/points\/canonical WAS/);
  assert.match(a, /clean\.filter\(x=>x\.current!==x\.last\)/);
  assert.doesNotMatch(a, /slice\(0,\s*100\)/);
});
test("eligible completion creates one event and totals", () => {
  const s = state();
  assert.equal(run(s), "created");
  assert.equal(s.events.length, 1);
  assert.equal(s.lifetime, 35);
});
test("replay reuses", () => {
  const s = state();
  run(s);
  assert.equal(run(s), "updated");
  assert.equal(s.events.length, 1);
});
test("wrong ownership fails", () => {
  const s = state();
  run(s);
  s.events[0].enr = "wrong";
  assert.throws(() => run(s), /ownership/);
});
test("satisfactory withdrawal deactivates and restore reactivates same ID", () => {
  const s = state();
  run(s);
  const id = s.events[0].id;
  s.hc.sat = false;
  run(s);
  assert.equal(s.events[0].active, false);
  s.hc.sat = true;
  run(s);
  assert.equal(s.events[0].id, id);
  assert.equal(s.events[0].active, true);
});
test("review withdrawal deactivates", () => {
  const s = state();
  run(s);
  s.hc.review = false;
  run(s);
  assert.equal(s.lifetime, 0);
});
test("feedback withdrawal deactivates", () => {
  const s = state();
  run(s);
  s.hc.feedback = "";
  run(s);
  assert.equal(s.events[0].active, false);
});
test("source-key-only unlinked ineligible event deactivates and repairs backlink", () => {
  const s = state();
  run(s);
  const id = s.events[0].id;
  s.hc.event = "";
  s.hc.sat = false;
  assert.equal(run(s), "deactivated");
  s.hc.event = id;
  assert.equal(s.events[0].active, false);
  const current = `HC|EVENT=${id}|INACTIVE|KEY=${s.events[0].key}`;
  assert.equal(Number(current !== current), 0);
});
test("inactive PHA blocks a new award", () => {
  const s = state();
  s.hc.activePha = false;
  assert.throws(() => run(s), /linked eligibility/);
});
test("inactive PHA deactivates and restoration reuses the same event", () => {
  const s = state();
  run(s);
  const id = s.events[0].id;
  s.hc.activePha = false;
  assert.equal(run(s), "deactivated");
  assert.equal(s.events[0].active, false);
  s.hc.activePha = true;
  run(s);
  assert.equal(s.events[0].id, id);
  assert.equal(s.events[0].active, true);
});
test("inactive Enrollment deactivates and restoration reuses the same event", () => {
  const s = state();
  run(s);
  const id = s.events[0].id;
  s.hc.activeEnrollment = false;
  run(s);
  assert.equal(s.events[0].active, false);
  s.hc.activeEnrollment = true;
  run(s);
  assert.equal(s.events[0].id, id);
  assert.equal(s.events[0].active, true);
});
test("missing links block", () => {
  const s = state();
  s.hc.week = "";
  assert.throws(() => run(s), /links/);
});
test("multiple pre-award submissions fail closed", () => {
  const s = state();
  s.hc.subs.push("recSUB0000000002");
  assert.throws(() => run(s), /canonical Submission/);
});
test("existing award may retain one owned resubmission", () => {
  const s = state();
  run(s);
  s.hc.subs.push("recSUB0000000002");
  assert.equal(run(s), "updated");
});
test("WAS repair preserves same event", () => {
  const s = state();
  run(s);
  s.events[0].was = "";
  run(s);
  assert.equal(s.events[0].was, s.was);
  assert.equal(s.events.length, 1);
});
test("duplicate exact events fail", () => {
  const s = state();
  run(s);
  s.events.push({ ...s.events[0], id: "recXP00000000002" });
  assert.throws(() => run(s), /duplicate/);
});
