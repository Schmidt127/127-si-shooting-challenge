#!/usr/bin/env node
/**
 * Offline regression for Automation 066 createRecordsInBatches fields contract.
 *
 * Reproduces live Airtable error:
 *   Invalid arguments passed to table.createRecordsAsync(records):
 *   records[0] should have a 'fields' property
 *
 * Run:
 *   node airtable/automations/shooting-challenge/lib/066-create-records-batch.test.js
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  normalizeCreateRecordPayload,
  normalizeCreateRecordPayloads,
  assertAirtableCreateRecordsShape,
  createRecordsInBatches,
  buildUnlockCreatePayload,
  planUnlockWrites,
} = require("./066-create-records-batch");
const { buildMilestoneSourceKey, detectCrossings } = require("./066-milestone-crossing-harness");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

const ENR = "recCyFEPeATOVNlr9";
const ACH = "recAchievementShotMs";
const SCRIPT_PATH = path.join(
  __dirname,
  "..",
  "066-achievements-and-milestones-create-shot-milestone-unlocks.js",
);

const milestones = [
  { id: "recMs100", threshold: 100, name: "100" },
  { id: "recMs250", threshold: 250, name: "250" },
  { id: "recMs500", threshold: 500, name: "500" },
  { id: "recMs1000", threshold: 1000, name: "1000" },
];

function makeStrictTable() {
  const calls = [];
  return {
    calls,
    async createRecordsAsync(records) {
      const ids = assertAirtableCreateRecordsShape(records);
      calls.push(records.map((r) => ({ ...r.fields })));
      return ids;
    },
  };
}

(async () => {
  test("repo script declares v3.5 and normalizeCreateRecordPayload", () => {
    const text = fs.readFileSync(SCRIPT_PATH, "utf8");
    assert.match(text, /Version:\s*v3\.5/);
    assert.match(text, /version:\s*"v3\.5"/);
    assert.match(text, /function normalizeCreateRecordPayload/);
    assert.match(text, /await table\.createRecordsAsync\(batch\)/);
    // Historical bug: raw payloads passed straight to createRecordsAsync in multi-path
    assert.doesNotMatch(
      text,
      /if \(batch\.length === 1\) \{\s*await table\.createRecordAsync\(batch\[0\]\);\s*\} else \{\s*await table\.createRecordsAsync\(batch\);/s,
    );
  });

  test("reproduces live Airtable error when raw field maps are passed unwrapped", () => {
    const rawPayloads = [
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs100",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs100"),
        activityDate: "2026-08-05",
      }),
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs250",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs250"),
        activityDate: "2026-08-05",
      }),
    ];
    assert.throws(
      () => assertAirtableCreateRecordsShape(rawPayloads),
      /records\[0\] should have a 'fields' property/,
    );
  });

  test("normalize wraps raw field maps", () => {
    const raw = { Enrollment: [{ id: ENR }], "Milestone Source Key": "SHOT_MILESTONE|a|b" };
    const wrapped = normalizeCreateRecordPayload(raw, 0);
    assert.deepStrictEqual(wrapped, { fields: raw });
  });

  test("normalize accepts already-wrapped { fields }", () => {
    const fields = { Enrollment: [{ id: ENR }] };
    const wrapped = normalizeCreateRecordPayload({ fields }, 0);
    assert.deepStrictEqual(wrapped, { fields });
  });

  test("normalize rejects empty / invalid payloads with diagnostics", () => {
    assert.throws(() => normalizeCreateRecordPayload(null, 3), /payloads\[3\]/);
    assert.throws(() => normalizeCreateRecordPayload({}, 1), /has no fields/);
    assert.throws(() => normalizeCreateRecordPayload({ fields: {} }, 2), /fields is empty/);
  });

  await testAsync("defensive helper always sends { fields } and supports >50 batch", async () => {
    const table = makeStrictTable();
    const payloads = [];
    for (let i = 0; i < 53; i += 1) {
      const mid = `recMs${String(i).padStart(4, "0")}`;
      payloads.push(
        buildUnlockCreatePayload({
          enrollmentId: ENR,
          achievementId: ACH,
          shotMilestoneId: mid,
          sourceKey: buildMilestoneSourceKey(ENR, mid),
          activityDate: "2026-08-05",
          weekId: "recWeek001",
        }),
      );
    }
    // Mix shapes: some pre-wrapped
    payloads[0] = { fields: payloads[0] };
    payloads[10] = { fields: payloads[10] };

    const batchLog = [];
    const result = await createRecordsInBatches(table, payloads, {
      batchSize: 50,
      onBatch: (info) => batchLog.push(info),
    });

    assert.strictEqual(result.normalizedCount, 53);
    assert.strictEqual(result.batches, 2);
    assert.strictEqual(batchLog[0].size, 50);
    assert.strictEqual(batchLog[1].size, 3);
    assert.strictEqual(result.createdIds.length, 53);
    assert.strictEqual(table.calls.length, 2);
    assert.ok(table.calls[0][0].Enrollment);
    assert.ok(table.calls[0][0]["Milestone Source Key"]);
  });

  test("one unlock create planned per eligible crossed milestone", () => {
    const crossings = detectCrossings({
      enrollmentId: ENR,
      previousShotTotal: 0,
      currentShotTotal: 600,
      milestones,
    });
    assert.strictEqual(crossings.length, 3);

    const crossingsByMilestoneId = {};
    for (const c of crossings) {
      crossingsByMilestoneId[c.milestoneId] = {
        activityDate: "2026-08-05",
        weekId: "recWeek001",
      };
    }

    const plan = planUnlockWrites({
      enrollmentId: ENR,
      achievementId: ACH,
      eligibleMilestones: milestones.filter((m) =>
        crossings.some((c) => c.milestoneId === m.id),
      ),
      crossingsByMilestoneId,
    });

    assert.strictEqual(plan.creates.length, 3);
    assert.strictEqual(plan.linkExisting.length, 0);
    for (const payload of plan.creates) {
      assert.ok(payload["Milestone Source Key"].startsWith(`SHOT_MILESTONE|${ENR}|`));
      assert.deepStrictEqual(payload.Enrollment, [{ id: ENR }]);
      assert.deepStrictEqual(payload.Achievement, [{ id: ACH }]);
      assert.ok(payload["Shot Milestone"][0].id);
      assert.ok(payload.Week[0].id);
    }
  });

  test("existing unlocks are linked rather than recreated; rerun creates none", () => {
    const crossings = detectCrossings({
      enrollmentId: ENR,
      previousShotTotal: 0,
      currentShotTotal: 600,
      milestones,
    });
    const crossingsByMilestoneId = {};
    const existingUnlockBySourceKey = {};
    for (const c of crossings) {
      crossingsByMilestoneId[c.milestoneId] = { activityDate: "2026-08-05", weekId: "recWeek001" };
      existingUnlockBySourceKey[c.sourceKey] = { id: `recUnlock${c.milestoneId}` };
    }

    const plan = planUnlockWrites({
      enrollmentId: ENR,
      achievementId: ACH,
      eligibleMilestones: milestones.filter((m) =>
        crossings.some((c) => c.milestoneId === m.id),
      ),
      existingUnlockBySourceKey,
      crossingsByMilestoneId,
    });

    assert.strictEqual(plan.creates.length, 0);
    assert.strictEqual(plan.linkExisting.length, 3);
    assert.ok(plan.linkExisting.every((row) => row.action === "link_existing"));

    const secondCrossings = detectCrossings({
      enrollmentId: ENR,
      previousShotTotal: 0,
      currentShotTotal: 600,
      milestones,
      unlockedSourceKeys: crossings.map((c) => c.sourceKey),
    });
    assert.strictEqual(secondCrossings.length, 0);
  });

  await testAsync("normalized creates succeed where raw multi-create failed", async () => {
    const table = makeStrictTable();
    const raw = normalizeCreateRecordPayloads([
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs100",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs100"),
        activityDate: "2026-08-05",
      }),
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs250",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs250"),
        activityDate: "2026-08-05",
      }),
    ]);
    // Prove wrapped form passes Airtable shape check
    assertAirtableCreateRecordsShape(raw);
    const result = await createRecordsInBatches(table, [
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs100",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs100"),
        activityDate: "2026-08-05",
      }),
      buildUnlockCreatePayload({
        enrollmentId: ENR,
        achievementId: ACH,
        shotMilestoneId: "recMs250",
        sourceKey: buildMilestoneSourceKey(ENR, "recMs250"),
        activityDate: "2026-08-05",
      }),
    ]);
    assert.strictEqual(result.createdIds.length, 2);
  });

  console.log("\nAll 066-create-records-batch regression tests passed.");
  console.log(
    "NOTE: Do not mark Automation 066 natural path Live Tested until v3.5 is pasted and rerun on recCyFEPeATOVNlr9.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
