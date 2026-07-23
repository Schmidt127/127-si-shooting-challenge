/**
 * Offline fixture suite for the REAL Stage 17 orchestrator (Automation 117).
 * WP-C: recording-credit request, exclusivity, XP idempotency, rerun safety.
 *
 * Run: node tools/testing/tests/test_117_offline.mjs
 */
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { buildZoomBase, run117, IDS, CREDIT_KEY } from "./run_117_script.mjs";

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (e) {
    results.push({ name, pass: false, error: e && e.message ? e.message : String(e) });
  }
}

function xpTable(base) {
  return base.tables.get("XP Events");
}
function zmTable(base) {
  return base.tables.get("Zoom Meetings");
}

function existingXp({ points = 25, active = true, awardedBy = "117-orchestrator-v1.1.1" } = {}) {
  return new MockRecord("recXpExisting00001", {
    "Source Key": CREDIT_KEY,
    "XP Points": points,
    "Active?": active,
    Enrollment: [{ id: IDS.ENROLLMENT }],
    "Awarded By": awardedBy,
  });
}

// --- 1. Approved recording request, no live credit → exactly one XP Event ---
await test("approved request with no conflict creates one XP Event", async () => {
  const base = buildZoomBase();
  const { output, error } = await run117({ base });
  assert.equal(error, null);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "created");
  const created = xpTable(base).createdPayloads;
  assert.equal(created.length, 1);
  const p = created[0].payload;
  assert.equal(p["Source Key"], CREDIT_KEY);
  assert.equal(p["XP Points"], 25);
  assert.equal(p["Active?"], true);
  assert.equal(p["XP Reason Public"], "Zoom recording quiz credit");
  assert.deepEqual(p["Enrollment"], [{ id: IDS.ENROLLMENT }]);
  assert.deepEqual(p["Zoom Meeting"], [{ id: IDS.MEETING }]);
  assert.deepEqual(p["Zoom Attendance"], [{ id: IDS.ZA }]);
  assert.deepEqual(p["Week"], [{ id: IDS.WEEK }]);
  assert.equal(output.values.attendeesWriteAttempted, false);
});

// --- 2. XP Activity Date derives from meeting Start Time in Denver time ---
await test("XP Activity Date comes from meeting Start Time (Denver date)", async () => {
  const base = buildZoomBase();
  await run117({ base });
  const p = xpTable(base).createdPayloads[0].payload;
  const d = p["XP Activity Date"];
  assert.ok(d instanceof Date, "activity date should be a Date");
  // 2026-07-15T18:00Z = 12:00 Denver → Denver date 2026-07-15
  assert.equal(d.toISOString().slice(0, 10), "2026-07-15");
});

// --- 3. Rerun after creation is idempotent ---
await test("rerun with existing matching XP Event skips (no duplicate)", async () => {
  const base = buildZoomBase({ xpRecords: [existingXp()] });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "skipped_exists");
  assert.equal(xpTable(base).createdPayloads.length, 0);
  assert.equal(xpTable(base).updates.length, 0);
});

// --- 4. Live-credit conflict soft-voids the recording XP Event ---
await test("conflict with live credit deactivates existing recording XP", async () => {
  const base = buildZoomBase({
    zaCells: { "Zoom Credit Conflict?": 1 },
    xpRecords: [existingXp()],
  });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "deactivated_on_conflict");
  const updates = xpTable(base).updates;
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].fields, { "Active?": false });
  assert.equal(output.values.gateActionOut, "skipped_conflict");
  assert.equal(output.values.perfectWeekActionOut, "skipped_conflict");
});

// --- 5. Conflict with no existing XP creates nothing ---
await test("conflict with no existing XP creates nothing", async () => {
  const base = buildZoomBase({ zaCells: { "Zoom Credit Conflict?": 1 } });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  assert.equal(xpTable(base).createdPayloads.length, 0);
});

// --- 6. Not-approved request creates nothing ---
await test("unapproved request creates no XP", async () => {
  const base = buildZoomBase({ zaCells: { "Zoom Credit Approved?": 0 } });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  assert.equal(xpTable(base).createdPayloads.length, 0);
  assert.equal(output.values.xpEventId, "");
});

// --- 7. Approval revoked after award soft-voids, never deletes ---
await test("revoked approval deactivates prior XP instead of deleting", async () => {
  const base = buildZoomBase({
    zaCells: { "Zoom Credit Approved?": 0 },
    xpRecords: [existingXp()],
  });
  const { output } = await run117({ base });
  assert.equal(output.values.actionOut, "deactivated_on_conflict");
  const updates = xpTable(base).updates;
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].fields, { "Active?": false });
});

// --- 8. Re-approval reactivates the soft-voided XP Event ---
await test("re-approval reactivates inactive XP Event (no duplicate create)", async () => {
  const base = buildZoomBase({ xpRecords: [existingXp({ active: false })] });
  const { output } = await run117({ base });
  assert.equal(output.values.actionOut, "updated");
  assert.equal(xpTable(base).createdPayloads.length, 0);
  const updates = xpTable(base).updates;
  assert.equal(updates.length, 1);
  assert.equal(updates[0].fields["Active?"], true);
});

// --- 9. Amount change updates points in place ---
await test("changed XP amount updates existing event points", async () => {
  const base = buildZoomBase({
    zaCells: { "Zoom XP Amount": 40 },
    xpRecords: [existingXp({ points: 25 })],
  });
  const { output } = await run117({ base });
  assert.equal(output.values.actionOut, "updated");
  assert.equal(xpTable(base).updates[0].fields["XP Points"], 40);
});

// --- 10. Steal guard: refuse to touch XP owned by another automation ---
await test("steal guard rejects XP Event owned by another automation", async () => {
  const base = buildZoomBase({
    xpRecords: [existingXp({ awardedBy: "101-zoom-live-v5.5" })],
  });
  const { output, error } = await run117({ base });
  assert.ok(error, "should throw");
  assert.match(String(error.message), /refuse steal/);
  assert.equal(output.values.statusOut, "error");
  assert.equal(xpTable(base).updates.length, 0);
});

// --- 11. Missing enrollment link errors (no silent skip) ---
await test("missing Enrollment link is an error", async () => {
  const base = buildZoomBase({ zaCells: { Enrollment: null } });
  const { output, error } = await run117({ base });
  assert.ok(error);
  assert.match(String(error.message), /Missing Enrollment link/);
  assert.equal(output.values.statusOut, "error");
});

// --- 12. Missing meeting link errors ---
await test("missing Zoom Meeting link is an error", async () => {
  const base = buildZoomBase({ zaCells: { "Zoom Meeting": null } });
  const { error } = await run117({ base });
  assert.ok(error);
  assert.match(String(error.message), /Missing Zoom Meeting link/);
});

// --- 13. Blank Zoom Credit Key refuses XP create ---
await test("blank Zoom Credit Key refuses XP create", async () => {
  const base = buildZoomBase({ zaCells: { "Zoom Credit Key": "" } });
  const { error } = await run117({ base });
  assert.ok(error);
  assert.match(String(error.message), /Blank Zoom Credit Key/);
});

// --- 14. Live-method rows are skipped, untouched ---
await test("live attendance rows skip the recording orchestrator", async () => {
  const base = buildZoomBase({ zaCells: { "Attendance Method": "Live" } });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_not_recording_quiz");
  assert.equal(xpTable(base).createdPayloads.length, 0);
  assert.equal(base.tables.get("Zoom Attendance").updates.length, 0);
});

// --- 15. Normalization stamps review status + submitted-at when blank ---
await test("blank review status normalizes to Needs Review with submitted-at", async () => {
  const base = buildZoomBase({
    zaCells: {
      "Recording Quiz Review Status": null,
      "Recording Quiz Submitted At": null,
      "Zoom Credit Approved?": 0, // not yet reviewed → no XP expected
    },
  });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  const zaUpdates = base.tables.get("Zoom Attendance").updates;
  assert.equal(zaUpdates.length, 1);
  assert.deepEqual(zaUpdates[0].fields["Recording Quiz Review Status"], {
    name: "Needs Review",
  });
  assert.ok(zaUpdates[0].fields["Recording Quiz Submitted At"] instanceof Date);
});

// --- 16. Needs Correction review flips satisfactory + bumps correction count ---
await test("Needs Correction review syncs satisfactory=false and bumps count", async () => {
  const base = buildZoomBase({
    zaCells: {
      "Recording Quiz Review Status": "Needs Correction",
      "Recording Quiz Satisfactory?": true,
      "Recording Quiz Correction Count": 1,
      "Zoom Credit Approved?": 0,
    },
  });
  await run117({ base });
  const patch = base.tables.get("Zoom Attendance").updates[0].fields;
  assert.equal(patch["Recording Quiz Satisfactory?"], false);
  assert.equal(patch["Recording Quiz Correction Count"], 2);
});

// --- 17. Gate + Perfect Week are report-only (no Applied? writes) ---
await test("gate and perfect-week are eligibility reports only, no Applied? writes", async () => {
  const base = buildZoomBase();
  const { output } = await run117({ base });
  assert.equal(output.values.gateActionOut, "eligible_awaiting_042");
  assert.equal(output.values.perfectWeekActionOut, "eligible_awaiting_057");
  for (const u of base.tables.get("Zoom Attendance").updates) {
    assert.ok(!("Gate Credit Applied?" in u.fields), "must not set Gate Credit Applied?");
    assert.ok(!("Perfect Week Credit Applied?" in u.fields), "must not set PW Applied?");
  }
});

// --- 18. Email is always deferred to 117f ---
await test("email is deferred to 117f; no send-key stamps", async () => {
  const base = buildZoomBase();
  const { output } = await run117({ base });
  assert.equal(output.values.emailActionOut, "deferred_to_117f");
  for (const u of base.tables.get("Zoom Attendance").updates) {
    assert.ok(!("Recording Approval Email Send Key" in u.fields));
    assert.ok(!("Recording Approval Email Sent At" in u.fields));
  }
});

// --- 19. Zoom Meetings.Attendees is never written ---
await test("Zoom Meetings table receives zero writes (Attendees protected)", async () => {
  const base = buildZoomBase();
  await run117({ base });
  assert.equal(zmTable(base).updates.length, 0);
  assert.equal(zmTable(base).createdPayloads.length, 0);
});

// --- 20. Dry-run performs zero writes and reports intended writes ---
await test("dry-run performs no writes and reports intended create", async () => {
  const base = buildZoomBase();
  const { output } = await run117({ base, dryRun: "true" });
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "dryrun_would_create");
  assert.equal(xpTable(base).createdPayloads.length, 0);
  assert.equal(base.tables.get("Zoom Attendance").updates.length, 0);
  const intended = JSON.parse(output.values.intendedWritesOut);
  assert.equal(intended.length, 1);
  assert.equal(intended[0].op, "create");
  assert.equal(intended[0].table, "XP Events");
});

// --- 21. Zero XP amount creates nothing ---
await test("zero Zoom XP Amount creates no XP Event", async () => {
  const base = buildZoomBase({ zaCells: { "Zoom XP Amount": 0 } });
  const { output } = await run117({ base });
  assert.equal(output.values.statusOut, "success");
  assert.equal(xpTable(base).createdPayloads.length, 0);
});

// --- 22. Invalid recordId rejected up front ---
await test("invalid recordId is rejected", async () => {
  const base = buildZoomBase();
  const { error } = await run117({ base, recordId: "not-a-record" });
  assert.ok(error);
  assert.match(String(error.message), /Invalid recordId/);
});

// --- report ---
let pass = 0;
for (const r of results) {
  if (r.pass) {
    pass += 1;
    console.log(`PASS  ${r.name}`);
  } else {
    console.log(`FAIL  ${r.name}\n      ${r.error}`);
  }
}
console.log(`\n${pass}/${results.length} passed`);
if (pass !== results.length) process.exit(1);
