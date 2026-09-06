#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hubRoot = (() => {
  for (const candidate of [
    path.join(root, "communications"),
    path.join(path.dirname(root), "communications"),
  ]) {
    if (fs.existsSync(path.join(candidate, "lib/template-candidate-renderer.js"))) return candidate;
  }
  throw new Error("Communications Hub lib not found (expected communications/)");
})();

const { renderTemplateCandidate } = await import(
  pathToFileURL(path.join(hubRoot, "lib/template-candidate-renderer.js")).href
);

const basePayload = {
  athleteName: "Curtis Schmidt",
  activityDate: "Aug. 21, 2026",
  weekName: "Week 1",
  weekDateRange: "Aug. 18, 2026 – Aug. 24, 2026",
  submissionStatMode: "Simple Total",
  shots: 120,
  makes: 84,
  shootingPercentage: 70,
  xpEarned: 10,
  xpExtraCredit: 0,
  submissionXp: 10,
  currentStreak: 12,
  currentLevel: "Hot Hand",
  nextLevel: "Sharpshooter",
  xpPageUrl: "https://www.fairfieldbasketballclub.com/shoot/athletes/curtis-s",
};

test("SC-171 daily submission template omits extra credit and shooting percentage", async () => {
  const rendered = await renderTemplateCandidate("DAILY_SUBMISSION", basePayload);
  assert.match(rendered.html, /XP Earned/);
  assert.match(rendered.html, /Current Day Streak/);
  assert.match(rendered.html, /12 days/);
  assert.doesNotMatch(rendered.html, /Extra Credit XP/);
  assert.doesNotMatch(rendered.html, /Shooting %/);
});

test("SC-171 daily submission template keeps XP earned visible", async () => {
  const rendered = await renderTemplateCandidate("DAILY_SUBMISSION", basePayload);
  assert.match(rendered.html, />10</);
});
