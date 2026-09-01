#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildVideosSubmittedThisWeek } from "../../lib/was-email-contracts/weekly-summary-email-content.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hubRoot = (() => {
  for (const candidate of [
    path.join(path.dirname(root), "communications"),
    path.join(root, "communications"),
    path.join(root, "communications-hub"),
  ]) {
    if (fs.existsSync(path.join(candidate, "lib/template-candidate-renderer.js"))) return candidate;
  }
  throw new Error("Communications Hub lib not found (expected ../communications/)");
})();

const { renderTemplateCandidate } = await import(
  pathToFileURL(path.join(hubRoot, "lib/template-candidate-renderer.js")).href
);

const weeklyBase = {
  athleteName: "Taylor Smith",
  weekLabel: "Week 4",
  weekDateRange: "August 18, 2026 – August 24, 2026",
  daysLogged: 4,
  shots: 900,
  makes: 540,
  shootingPercentage: 60,
  weeklyGoal: 1000,
  weeklyXp: 95,
  currentLevel: "Hot Hand",
  packageKind: "normal",
};

test("072 contract builds videosSubmittedThisWeek for Hub ingest", () => {
  const rows = buildVideosSubmittedThisWeek(
    [
      {
        recordId: "recVF001",
        activityDateKey: "2026-08-18",
        customVideoFileName: "Catch-and-shoot.mp4",
        originalFileName: "upload.mov",
      },
      {
        recordId: "recVF002",
        activityDateKey: "2026-08-20",
        customVideoFileName: "",
        originalFileName: "form-check.mp4",
      },
    ],
    { weekStartKey: "2026-08-17", weekEndKey: "2026-08-23" },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].fileName, "Catch-and-shoot.mp4");
  assert.equal(rows[1].fileName, "form-check.mp4");
});

test("weekly summary renders Videos Submitted This Week when payload exists", async () => {
  const rendered = await renderTemplateCandidate("WEEKLY_ATHLETE_SUMMARY", {
    ...weeklyBase,
    videosSubmittedThisWeek: [
      { activityDate: "2026-08-18", fileName: "Catch-and-shoot.mp4" },
      { activityDate: "2026-08-20", fileName: "form-check.mp4" },
    ],
    weeklyVideoCount: 2,
    weeklyVideoTarget: 3,
  });
  assert.match(rendered.html, /Videos Submitted This Week/);
  assert.match(rendered.html, /Catch-and-shoot\.mp4/);
  assert.match(rendered.html, /form-check\.mp4/);
  assert.match(rendered.html, /2026-08-18/);
  assert.match(rendered.html, /2 of 3/);
});

test("weekly summary handles empty videosSubmittedThisWeek gracefully", async () => {
  const rendered = await renderTemplateCandidate("WEEKLY_ATHLETE_SUMMARY", {
    ...weeklyBase,
    videosSubmittedThisWeek: [],
  });
  assert.doesNotMatch(rendered.html, /Videos Submitted This Week/);
  assert.match(rendered.html, /Your Weekly Mission Report/);
});

test("weekly summary video section remains readable on mobile layout tokens", async () => {
  const rendered = await renderTemplateCandidate("WEEKLY_ATHLETE_SUMMARY", {
    ...weeklyBase,
    videosSubmittedThisWeek: [
      {
        activityDate: "2026-08-19",
        fileName: "Very-long-custom-video-name-that-should-wrap-cleanly-on-small-screens.mov",
      },
    ],
    weeklyVideoCount: 1,
  });
  assert.match(rendered.html, /word-break:break-word/);
  assert.match(rendered.html, /max-width:620px/);
  assert.match(rendered.html, /Very-long-custom-video-name/);
});
