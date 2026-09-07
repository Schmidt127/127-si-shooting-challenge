import { afterEach, describe, expect, it } from "vitest";

import {
  buildCurriculumAssetSourceId,
  __resetCurriculumStagingMemoryForTests,
  storeCurriculumStagingUpload,
  getCurriculumStagingRecord,
  loadCurriculumStagingBytes,
} from "@/lib/curriculum/upload-staging-store";
import { buildCurriculumSubmissionAssetFields } from "@/lib/curriculum/upload-staging-service";
import {
  sanitizeUploadFileName,
  parseCurriculumStagingUploadFields,
} from "@/lib/curriculum/upload-staging-validation";
import {
  answersForHomeworkResponses,
  parseCurriculumSubmitPayload,
} from "@/lib/curriculum/submit-validation";

afterEach(() => {
  __resetCurriculumStagingMemoryForTests();
});

describe("sanitizeUploadFileName", () => {
  it("strips path traversal segments", () => {
    expect(sanitizeUploadFileName("../../etc/passwd.jpg")).toBe("passwd.jpg");
    expect(sanitizeUploadFileName("C:\\\\temp\\\\photo.png")).toBe("photo.png");
  });
});

describe("parseCurriculumStagingUploadFields", () => {
  it("accepts jpeg under the size cap", () => {
    const parsed = parseCurriculumStagingUploadFields({
      enrollmentId: "recEnroll00000001",
      assignmentKey: "SHOT_TRACKER_SETUP",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      fileName: "proof.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects disallowed MIME and oversized files", () => {
    expect(
      parseCurriculumStagingUploadFields({
        enrollmentId: "recEnroll00000001",
        assignmentKey: "SHOT_TRACKER_SETUP",
        questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
        fileName: "x.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 100,
      }).ok,
    ).toBe(false);

    expect(
      parseCurriculumStagingUploadFields({
        enrollmentId: "recEnroll00000001",
        assignmentKey: "SHOT_TRACKER_SETUP",
        questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
        fileName: "big.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 9 * 1024 * 1024,
      }).ok,
    ).toBe(false);
  });
});

describe("staging store", () => {
  it("stores and reloads bytes from memory", async () => {
    const bytes = Buffer.from("fake-jpeg-bytes");
    const stored = await storeCurriculumStagingUpload({
      enrollmentId: "recEnroll00000001",
      assignmentKey: "SHOT_TRACKER_SETUP",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      fileName: "proof.jpg",
      mimeType: "image/jpeg",
      sizeBytes: bytes.byteLength,
      bytes,
    });
    expect(stored.stagingId.startsWith("stg_")).toBe(true);
    const loaded = await getCurriculumStagingRecord(stored.stagingId);
    expect(loaded?.fileName).toBe("proof.jpg");
    const roundTrip = await loadCurriculumStagingBytes(loaded!);
    expect(roundTrip?.equals(bytes)).toBe(true);
  });
});

describe("Submission Asset field builder (HC + Enrollment, blank Submission)", () => {
  it("creates SA fields without Submission - Linked or Daily Submission", () => {
    const fields = buildCurriculumSubmissionAssetFields({
      enrollmentId: "recEnroll00000001",
      homeworkCompletionId: "recHc000000000001",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      fileName: "proof.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      sourceAttachmentId: "curriculum:abcdef",
    });

    expect(fields["Enrollment - Linked"]).toEqual(["recEnroll00000001"]);
    expect(fields["Homework Completions"]).toEqual(["recHc000000000001"]);
    expect(fields).not.toHaveProperty("Submission - Linked");
    expect(fields["Asset Purpose"]).toBe("Homework 1");
    expect(fields["Asset Slot"]).toBe("HW1");
    expect(fields["Asset Label"]).toBe("SHOT_TRACKER_SETUP.1-2.Q07");
    expect(fields["Upload Status"]).toBe("Pending Link");
    expect(fields["Send to Make Trigger"]).toBe(false);
    expect(fields["Original File Name"]).toBe("proof.jpg");
    expect(fields["File MIME Type"]).toBe("image/jpeg");
    expect(fields["File Size Bytes"]).toBe(2048);
  });

  it("arms Send to Make Trigger when attachment URL is provided on create", () => {
    const fields = buildCurriculumSubmissionAssetFields({
      enrollmentId: "recEnroll00000001",
      homeworkCompletionId: "recHc000000000001",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      fileName: "proof.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      sourceAttachmentId: "curriculum:abcdef",
      attachmentUrl: "https://example.com/proof.jpg",
    });
    expect(fields["Send to Make Trigger"]).toBe(true);
    expect(fields["Airtable Attachment"]).toEqual([
      { url: "https://example.com/proof.jpg", filename: "proof.jpg" },
    ]);
  });

  it("builds stable idempotent Source Attachment IDs", () => {
    const a = buildCurriculumAssetSourceId({
      homeworkCompletionId: "recHc000000000001",
      attemptId: "recAttempt0000001",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      stagingId: "stg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    const b = buildCurriculumAssetSourceId({
      homeworkCompletionId: "recHc000000000001",
      attemptId: "recAttempt0000001",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      stagingId: "stg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    const c = buildCurriculumAssetSourceId({
      homeworkCompletionId: "recHc000000000001",
      attemptId: "recAttempt0000001",
      questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
      stagingId: "stg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith("curriculum:")).toBe(true);
  });
});

describe("submit payload assets + file_upload responses", () => {
  const base = {
    enrollmentId: "recEnroll00000001",
    assignmentKey: "SHOT_TRACKER_SETUP",
    curriculumVersion: 1,
    gradeBand: "1-2",
    attemptNumber: 1,
    parentAttemptNumber: null,
    submittedAt: "2026-09-07T12:00:00.000Z",
  };

  it("accepts structured grade bands and asset refs", () => {
    const parsed = parseCurriculumSubmitPayload({
      ...base,
      answers: [
        {
          questionKey: "SHOT_TRACKER_SETUP.1-2.Q01",
          questionOrder: 1,
          responseType: "yes_no",
          promptSnapshot: "Ready?",
          value: "yes",
        },
      ],
      assets: [
        {
          questionKey: "SHOT_TRACKER_SETUP.1-2.Q07",
          stagingId: "stg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          fileName: "proof.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.gradeBand).toBe("1-2");
    expect(parsed.value.assets).toHaveLength(1);
  });

  it("rejects huge binary-like file_upload answer values", () => {
    const result = parseCurriculumSubmitPayload({
      ...base,
      gradeBand: "4-6",
      answers: [
        {
          questionKey: "SHOT_TRACKER_SETUP.4-6.Q07",
          questionOrder: 7,
          responseType: "file_upload",
          promptSnapshot: "Upload proof",
          value: "x".repeat(3000),
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("does not write file_upload answers as Homework Response rows", () => {
    const responses = answersForHomeworkResponses(
      [
        {
          questionKey: "Q01",
          questionOrder: 1,
          responseType: "short_answer",
          promptSnapshot: "Text?",
          value: "hello",
        },
        {
          questionKey: "Q07",
          questionOrder: 7,
          responseType: "file_upload",
          promptSnapshot: "File?",
          value: '{"kind":"file_ref","stagingId":"stg_aaa"}',
        },
      ],
      [
        {
          questionKey: "Q07",
          stagingId: "stg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          fileName: "proof.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
        },
      ],
    );
    expect(responses).toHaveLength(1);
    expect(responses[0].questionKey).toBe("Q01");
  });
});
