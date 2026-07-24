#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  QUIZ_ATTACHMENT_FIELD,
  QUIZ_ATTACHMENT_TYPE,
  quizOptionAPacket,
  quizOptionBPacket,
  recommendQuizPath,
} = require("../../lib/homework-contracts/quiz-path");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    throw error;
  }
}

test("option A names Quiz Result PDF attachment field", () => {
  const a = quizOptionAPacket();
  assert.strictEqual(a.airtableField.name, QUIZ_ATTACHMENT_FIELD);
  assert.strictEqual(a.airtableField.type, QUIZ_ATTACHMENT_TYPE);
  assert.strictEqual(a.assetCreation, true);
  assert.strictEqual(a.xp.owner, "065");
  assert.ok(a.testing.length >= 4);
});

test("option B forbids fake attachments", () => {
  const b = quizOptionBPacket();
  assert.strictEqual(b.assetCreation, false);
  assert.strictEqual(b.upload.forbidFakeAttachment, true);
  assert.ok(b.automation067.actionOutSuccess.includes("no_attachment_field"));
});

test("current PROD facts recommend Option B", () => {
  const r = recommendQuizPath({
    quizTableHasAttachmentField: false,
    homeworkUpload070aOn: false,
  });
  assert.strictEqual(r.recommendation, "option_b_attachment_less");
  assert.strictEqual(r.productDecisionRequired, true);
});

test("prefer upload parity with field → Option A", () => {
  const r = recommendQuizPath({
    quizTableHasAttachmentField: true,
    preferUploadParity: true,
  });
  assert.strictEqual(r.recommendation, "option_a_quiz_result_pdf");
});

console.log("quiz-path tests passed");
