#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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
const p071 = path.join(
  root,
  "airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js",
);
const p073 = path.join(
  root,
  "airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js",
);
const s071 = fs.readFileSync(p071, "utf8");
const s073 = fs.readFileSync(p073, "utf8");

const { renderTemplateCandidate } = await import(
  pathToFileURL(path.join(hubRoot, "lib/template-candidate-renderer.js")).href
);
const { BRAND } = await import(pathToFileURL(path.join(hubRoot, "emails/lib/brand.js")).href);

const homeworkSample = {
  parentFirstName: "Jordan",
  athleteName: "Taylor Smith",
  athleteFirstName: "Taylor",
  athleteLastName: "Smith",
  assignmentTitle: "Form Shooting Reflection",
  homeworkTitle: "Form Shooting Reflection",
  weekName: "Week 4",
  programName: "127 SI Shooting Challenge 2026-2027",
  coachFeedback: "Great footwork and follow-through.",
  totalHomeworkXpAwarded: 25,
  homeworkSlot: "HW1",
  reviewStatus: "Satisfactory",
  submittedFiles: [{ url: "https://cdn.example.com/homework.pdf", label: "Taylor homework.pdf" }],
  landingPageUrl: BRAND.landingUrl,
  shootPageUrl: BRAND.shootUrl,
  homeworkPageUrl: BRAND.homeworkUrl,
};

const videoSample = {
  parentFirstName: "Jordan",
  athleteName: "Taylor Smith",
  weekName: "Week 4",
  programName: "127 SI Shooting Challenge 2026-2027",
  coachFeedback: "Strong release and balance on the catch-and-shoot reps.",
  totalVideoXpAwarded: 40,
  originalFileName: "taylor-week4-video.mp4",
  videoUrl: "https://cdn.example.com/reviewed-video.mp4",
  reviewStatus: "Review complete",
  landingPageUrl: BRAND.landingUrl,
  shootPageUrl: BRAND.shootUrl,
};

test("071 v4.3 enriches branded template payload without changing Hub routing", () => {
  assert.match(s071, /Version: v4\.3/);
  assert.match(s071, /reviewStatus: "Satisfactory"/);
  assert.match(s071, /landingPageUrl: CANONICAL_URLS\.landing/);
  assert.match(s071, /shootPageUrl: CANONICAL_URLS\.shoot/);
  assert.match(s071, /homeworkPageUrl: CANONICAL_URLS\.homework/);
  assert.match(s071, /weekName: weekName \|\| undefined/);
  assert.match(s071, /HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|/);
  assert.match(s071, /Parent Feedback Sent\? is already checked/);
});

test("073 v4.4 enriches branded template payload without changing Hub routing", () => {
  assert.match(s073, /Version: v4\.4/);
  assert.match(s073, /reviewStatus: "Review complete"/);
  assert.match(s073, /landingPageUrl: CANONICAL_URLS\.landing/);
  assert.match(s073, /shootPageUrl: CANONICAL_URLS\.shoot/);
  assert.match(s073, /VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|/);
  assert.match(s073, /Parent Feedback Sent\? is already checked/);
});

test("homework and video templates share approved header and footer", async () => {
  const homework = await renderTemplateCandidate("HOMEWORK_FEEDBACK", homeworkSample);
  const video = await renderTemplateCandidate("VIDEO_FEEDBACK", videoSample);
  for (const rendered of [homework, video]) {
    assert.match(rendered.html, /127 Sports Intensity/);
    assert.match(rendered.html, /Fairfield Basketball Club/);
    assert.match(rendered.html, /fairfieldbasketballclub\.com\/shoot/);
    assert.match(rendered.html, /Shooting Challenge Page/);
    assert.match(rendered.html, /Daily Submission Form/);
  }
});

test("homework feedback renders personalization, links, and plain text", async () => {
  const rendered = await renderTemplateCandidate("HOMEWORK_FEEDBACK", homeworkSample);
  assert.equal(rendered.subject, "Homework Feedback – Taylor Smith – Form Shooting Reflection");
  assert.match(rendered.html, /Hi Jordan,/);
  assert.match(rendered.html, /Form Shooting Reflection/);
  assert.match(rendered.html, /Great footwork and follow-through/);
  assert.match(rendered.html, /cdn\.example\.com\/homework\.pdf/);
  assert.match(rendered.text, /Taylor Smith/);
  assert.doesNotMatch(rendered.text, /<[^>]+>/);
});

test("video feedback renders personalization, watch link, and plain text", async () => {
  const rendered = await renderTemplateCandidate("VIDEO_FEEDBACK", videoSample);
  assert.equal(rendered.subject, "Video Feedback for Taylor Smith");
  assert.match(rendered.html, /Watch Reviewed Video/);
  assert.match(rendered.html, /cdn\.example\.com\/reviewed-video\.mp4/);
  assert.match(rendered.text, /Strong release and balance/);
});

test("missing optional fields do not break homework or video HTML", async () => {
  const homework = await renderTemplateCandidate("HOMEWORK_FEEDBACK", {
    athleteName: "Taylor Smith",
    homeworkTitle: "Reflection",
    coachFeedback: "Nice effort.",
    totalHomeworkXpAwarded: 10,
    submittedFiles: [],
  });
  assert.match(homework.html, /Open Homework Page/);
  assert.doesNotMatch(homework.html, /href=""/);

  const video = await renderTemplateCandidate("VIDEO_FEEDBACK", {
    athleteName: "Taylor Smith",
    coachFeedback: "Keep working.",
    totalVideoXpAwarded: 5,
    videoUrl: "",
  });
  assert.match(video.html, /parent-facing video link was not available/i);
  assert.doesNotMatch(video.html, /Watch Reviewed Video/);
});

test("coach feedback is escaped in rendered HTML", async () => {
  const rendered = await renderTemplateCandidate("VIDEO_FEEDBACK", {
    ...videoSample,
    coachFeedback: '<img src=x onerror=alert(1)>',
  });
  assert.doesNotMatch(rendered.html, /<img[^>]*onerror=/i);
  assert.match(rendered.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("internal record identifiers stay out of parent-facing email bodies", async () => {
  const homework = await renderTemplateCandidate("HOMEWORK_FEEDBACK", {
    ...homeworkSample,
    canonicalProgramHomeworkAssignmentId: "recPHA0000000001",
    canonicalWeekId: "recWEEK000000001",
  });
  const video = await renderTemplateCandidate("VIDEO_FEEDBACK", {
    ...videoSample,
    videoFeedbackKey: "VIDEO_FEEDBACK|recASSET00000001",
    canonicalSubmissionId: "recSUB0000000001",
  });
  assert.doesNotMatch(homework.html, /recPHA0000000001/);
  assert.doesNotMatch(video.html, /recSUB0000000001/);
  assert.doesNotMatch(video.text, /VIDEO_FEEDBACK\|/);
});
