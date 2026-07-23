"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { validateRecords, evaluateRecord } = require("../lib/content-quality");

const FIXTURES = path.resolve(__dirname, "../../../tests/fixtures/tutorials-content");

describe("content quality validator", () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, "quality-cases.json"), "utf8"));
  const duplicatePublicIds = fixture.records.filter((r) => r.duplicatePublic).map((r) => r.id);
  const report = validateRecords(fixture.records, { duplicatePublicIds });

  it("passes a complete publishable record", () => {
    const row = report.records.find((r) => r.id === "recQPass001");
    assert.ok(row);
    assert.equal(row.pass, true);
  });

  it("fails athlete email / private data", () => {
    const row = report.records.find((r) => r.id === "recQFailEmail001");
    assert.ok(row);
    assert.equal(row.results.no_athlete_email_or_private_data.pass, false);
    assert.equal(row.pass, false);
  });

  it("fails internal-only language on published items", () => {
    const row = report.records.find((r) => r.id === "recQFailInternal001");
    assert.ok(row);
    assert.equal(row.results.no_internal_only_language.pass, false);
  });

  it("allows blank URL on unpublished incomplete media", () => {
    const row = report.records.find((r) => r.id === "recQBlankUrl001");
    assert.ok(row);
    assert.equal(row.results.valid_media_url.pass, true);
  });

  it("fails invalid media URL when published", () => {
    const row = report.records.find((r) => r.id === "recQBadUrl001");
    assert.ok(row);
    assert.equal(row.results.valid_media_url.pass, false);
    assert.equal(row.pass, false);
  });

  it("fails duplicate public item", () => {
    const row = report.records.find((r) => r.id === "recQDupPublic001");
    assert.ok(row);
    assert.equal(row.results.no_duplicate_public_item.pass, false);
  });

  it("fails non-accessible link text", () => {
    const row = report.records.find((r) => r.id === "recQClickHere001");
    assert.ok(row);
    assert.equal(row.results.accessible_link_text.pass, false);
  });

  it("fails missing title", () => {
    const row = report.records.find((r) => r.id === "recQMissingTitle001");
    assert.ok(row);
    assert.equal(row.results.title_present.pass, false);
  });

  it("skips grade band when not in schema unless required", () => {
    const skipped = evaluateRecord({
      id: "x",
      fields: {
        Name: "No Band",
        "Brief Description": "Desc",
        "Detailed Description": "Long enough instructions for athletes here.",
        "Link to Video": "https://example.com/a",
        "OK to Publish on Softr": false,
      },
    });
    assert.equal(skipped.results.grade_band_present.pass, true);

    const required = evaluateRecord(
      {
        id: "y",
        fields: {
          Name: "Needs Band",
          "Brief Description": "Desc",
          "Detailed Description": "Long enough instructions for athletes here.",
          "Link to Video": "https://example.com/a",
          "OK to Publish on Softr": true,
        },
      },
      { requireGradeBand: true },
    );
    assert.equal(required.results.grade_band_present.pass, false);
  });
});
