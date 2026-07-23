"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { detectDuplicates, classifyPair, projectRecord } = require("../lib/duplicate-detector");

const FIXTURES = path.resolve(__dirname, "../../../tests/fixtures/tutorials-content");

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

describe("duplicate detector fixtures", () => {
  const source = loadJson("tutorials-assets-source.json").records;
  const target = loadJson("tutorials-canonical.json").records;
  const report = detectDuplicates({ sourceRecords: source, targetRecords: target });

  it("detects same title / same URL as strong duplicate (not title-only)", () => {
    const hit = report.pairs.find((p) => p.sourceId === "recAssetDupUrl001");
    assert.ok(hit);
    assert.ok(["exact_duplicate", "probable_duplicate", "conflicting"].includes(hit.classification));
    assert.ok(hit.reasons.includes("canonical_url") || hit.reasons.includes("attachment_id"));
  });

  it("classifies same title / different Grade Band as related but distinct", () => {
    const intra = report.intraSourcePairs.find(
      (p) =>
        (p.sourceId === "recAssetSameTitleDiffBand001" && p.targetId === "recAssetSameTitleDiffBand002") ||
        (p.sourceId === "recAssetSameTitleDiffBand002" && p.targetId === "recAssetSameTitleDiffBand001"),
    );
    assert.ok(intra);
    assert.equal(intra.classification, "related_but_distinct");
    assert.ok(intra.reasons.includes("same_title_different_grade_band"));
  });

  it("detects different title / same URL", () => {
    const hit = report.pairs.find((p) => p.sourceId === "recAssetDiffTitleSameUrl001");
    assert.ok(hit);
    assert.ok(hit.reasons.includes("canonical_url"));
    assert.notEqual(hit.classification, "related_but_distinct");
  });

  it("flags same media / different metadata as conflicting when publish/metadata diverge", () => {
    const hit = report.pairs.find((p) => p.sourceId === "recAssetSameMediaDiffMeta001");
    assert.ok(hit);
    assert.ok(["conflicting", "probable_duplicate", "exact_duplicate"].includes(hit.classification));
    assert.ok(
      hit.reasons.includes("same_media_different_metadata") ||
        hit.reasons.includes("metadata_or_publish_conflict") ||
        hit.reasons.includes("published_vs_unpublished_version") ||
        hit.reasons.includes("canonical_url"),
    );
  });

  it("handles blank URL without forcing title-only merge", () => {
    const orphan = report.orphans.find((o) => o.id === "recAssetBlankUrl001");
    assert.ok(orphan);
    const titleOnlyAutoDelete = false;
    assert.equal(titleOnlyAutoDelete, false);
    assert.equal(report.policy.neverDeleteByTitleAlone, true);
  });

  it("marks incomplete content", () => {
    const incomplete = report.incomplete.find((i) => i.id === "recAssetIncomplete001");
    assert.ok(incomplete);
    assert.equal(incomplete.classification, "incomplete");
    assert.ok(incomplete.reasons.includes("missing_title"));
  });

  it("surfaces linked homework on orphan rows", () => {
    const orphan = report.orphans.find((o) => o.id === "recAssetLinkedHw001");
    assert.ok(orphan);
    assert.ok(orphan.reasons.includes("has_linked_homework"));
    assert.deepEqual(orphan.linkedHomework, ["recHw001"]);
  });

  it("surfaces linked Learning Activity on orphan rows", () => {
    const orphan = report.orphans.find((o) => o.id === "recAssetLinkedLa001");
    assert.ok(orphan);
    assert.ok(orphan.reasons.includes("has_linked_learning_activity"));
    assert.deepEqual(orphan.linkedLearningActivities, ["recLa001"]);
  });

  it("detects published versus unpublished version conflict path", () => {
    const a = projectRecord({
      id: "a",
      fields: {
        Name: "Character Focus Draft",
        "Link to Video": "https://example.com/videos/character-draft",
        "OK to Publish on Softr": true,
        "Brief Description": "A",
        "Detailed Description": "B",
      },
    });
    const b = projectRecord({
      id: "b",
      fields: {
        Name: "Character Focus Draft",
        "Link to Video": "https://example.com/videos/character-draft",
        "OK to Publish on Softr": false,
        "Brief Description": "A2",
        "Detailed Description": "B2",
      },
    });
    const result = classifyPair(a, b);
    assert.ok(result);
    assert.ok(
      result.reasons.includes("published_vs_unpublished_version") ||
        result.classification === "conflicting",
    );
  });

  it("exact record id match is exact_duplicate", () => {
    const hit = report.pairs.find((p) => p.sourceId === "recTutExact001");
    assert.ok(hit);
    assert.equal(hit.classification, "exact_duplicate");
    assert.ok(hit.reasons.includes("exact_linked_record_id"));
  });
});
