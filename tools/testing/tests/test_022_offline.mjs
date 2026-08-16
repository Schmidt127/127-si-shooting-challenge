/**
 * Offline regression tests for Automation 022 v2.0 child upload writeback.
 * Run: node --test tools/testing/tests/test_022_offline.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MockRecord } from "./airtable_mock.mjs";
import { build022Base, run022, IDS } from "./run_022_script.mjs";

function videoRecord(base, id = IDS.VIDEO) {
  return base.getTable("Video Feedback").records.get(id);
}

function homeworkRecord(base, id = IDS.HOMEWORK) {
  return base.getTable("Homework Completions").records.get(id);
}

function selectName(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || "";
}

function totalChildWrites(base) {
  return (
    base.getTable("Video Feedback").updates.length +
    base.getTable("Homework Completions").updates.length
  );
}

function assetCreates(base) {
  return (
    base.getTable("Video Feedback").createdPayloads.length +
    base.getTable("Homework Completions").createdPayloads.length
  );
}

test("1. Video asset with Reviewer File URL prefers reviewer URL", async () => {
  const base = build022Base({
    assetCells: {
      "Reviewer File URL": "https://reviewer.example/primary",
      "Canonical File URL": "https://canonical.example/secondary",
      "Google Drive File URL": "https://drive.example/tertiary",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "synced_video");
  assert.equal(output.values.sourceUrlUsed, "Reviewer File URL");
  assert.equal(output.values.writebackVerified, true);
  assert.equal(
    videoRecord(base).getCellValue("Video URL or Drive Link"),
    "https://reviewer.example/primary"
  );
  assert.equal(selectName(videoRecord(base).getCellValue("Upload Status")), "Uploaded");
  assert.equal(assetCreates(base), 0);
});

test("2. Video asset with only Canonical File URL uses canonical", async () => {
  const base = build022Base({
    assetCells: {
      "Reviewer File URL": "",
      "Canonical File URL": "https://canonical.example/only",
      "Google Drive File URL": "https://drive.example/fallback",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.sourceUrlUsed, "Canonical File URL");
  assert.equal(
    videoRecord(base).getCellValue("Video URL or Drive Link"),
    "https://canonical.example/only"
  );
});

test("3. Video asset with only Google Drive File URL uses drive URL", async () => {
  const base = build022Base({
    assetCells: {
      "Reviewer File URL": "",
      "Canonical File URL": "",
      "Google Drive File URL": "https://drive.example/only-drive",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.sourceUrlUsed, "Google Drive File URL");
  assert.equal(
    videoRecord(base).getCellValue("Video URL or Drive Link"),
    "https://drive.example/only-drive"
  );
});

test("4. Video asset with no URL leaves existing Video URL untouched", async () => {
  const existing = "https://coach.example/already-valid";
  const base = build022Base({
    preserveVideoUrl: existing,
    assetCells: {
      "Reviewer File URL": "",
      "Canonical File URL": "",
      "Google Drive File URL": "",
      "Google Drive File ID": "",
      "Google Drive Folder ID": "",
      "Google Drive Folder URL": "",
      "Google Drive View URL": "",
      "Google Drive Download URL": "",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.sourceUrlUsed, "");
  assert.equal(
    videoRecord(base).getCellValue("Video URL or Drive Link"),
    existing
  );

  const urlWrites = base
    .getTable("Video Feedback")
    .updates.filter((u) =>
      Object.prototype.hasOwnProperty.call(u.fields, "Video URL or Drive Link")
    );
  assert.equal(urlWrites.length, 0);
});

test("5. Video asset status Uploaded writes Uploaded", async () => {
  const base = build022Base({
    assetCells: { "Upload Status": { id: "selUploaded022", name: "Uploaded" } },
  });
  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.childUploadStatus, "Uploaded");
  assert.equal(selectName(videoRecord(base).getCellValue("Upload Status")), "Uploaded");
});

test("6. Video asset status Processing writes Processing", async () => {
  const base = build022Base({
    assetCells: { "Upload Status": { id: "selProcessing022", name: "Processing" } },
  });
  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.childUploadStatus, "Processing");
  assert.equal(selectName(videoRecord(base).getCellValue("Upload Status")), "Processing");
});

test("7. Video asset status Error writes Error", async () => {
  const base = build022Base({
    assetCells: {
      "Upload Status": { id: "selError022", name: "Error" },
      "Upload Error": "Lambda failed",
    },
  });
  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.childUploadStatus, "Error");
  assert.equal(selectName(videoRecord(base).getCellValue("Upload Status")), "Error");
  assert.equal(videoRecord(base).getCellValue("Upload Error"), "Lambda failed");
});

test("8. Video asset status Pending Link is skipped", async () => {
  const base = build022Base({
    assetCells: {
      "Upload Status": { id: "selPendingLink022", name: "Pending Link" },
    },
  });
  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_pending_link");
  assert.equal(output.values.writebackVerified, false);
  assert.equal(totalChildWrites(base), 0);
});

test("9. Missing child record is skipped", async () => {
  const base = build022Base({
    assetCells: { "Video Feedback": [] },
  });
  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "skipped");
  assert.equal(output.values.actionOut, "skipped_no_video_feedback");
  assert.equal(totalChildWrites(base), 0);
});

test("10. Multiple linked child records error", async () => {
  const base = build022Base({
    assetCells: {
      "Video Feedback": [
        { id: IDS.VIDEO, name: "VF-1" },
        { id: IDS.VIDEO_2, name: "VF-2" },
      ],
    },
    videoRecords: [
      new MockRecord(IDS.VIDEO, {
        "Upload Status": { id: "selPending022", name: "Pending" },
        "Video URL or Drive Link": "",
      }),
      new MockRecord(IDS.VIDEO_2, {
        "Upload Status": { id: "selPending022", name: "Pending" },
        "Video URL or Drive Link": "",
      }),
    ],
  });

  const { output, error } = await run022({ base });
  assert.ok(error);
  assert.match(String(error.message), /Multiple Video Feedback/i);
  assert.equal(output.values.statusOut, "error");
  assert.equal(output.values.actionOut, "error");
  assert.equal(totalChildWrites(base), 0);
});

test("11. Repeated/idempotent execution writes once then already_synced", async () => {
  const base = build022Base();
  const first = await run022({ base });
  assert.equal(first.error, null, first.error && first.error.message);
  assert.equal(first.output.values.statusOut, "success");
  assert.equal(first.output.values.actionOut, "synced_video");
  assert.equal(first.output.values.writebackVerified, true);

  const writesAfterFirst = totalChildWrites(base);
  assert.ok(writesAfterFirst >= 1);

  const second = await run022({ base });
  assert.equal(second.error, null, second.error && second.error.message);
  assert.equal(second.output.values.statusOut, "success");
  assert.equal(second.output.values.actionOut, "already_synced");
  assert.equal(second.output.values.writebackVerified, true);
  assert.equal(totalChildWrites(base), writesAfterFirst);
  assert.equal(assetCreates(base), 0);
});

test("12. Existing Video Feedback Upload Status single-select is required and used", async () => {
  const base = build022Base();
  const field = base.getTable("Video Feedback").getField("Upload Status");
  assert.equal(field.type, "singleSelect");
  assert.equal(field.isComputed, false);

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.childUploadStatus, "Uploaded");

  const statusWrite = base
    .getTable("Video Feedback")
    .updates.find((u) => u.fields["Upload Status"]);
  assert.ok(statusWrite);
  assert.equal(statusWrite.fields["Upload Status"].id, "selUploaded022");
});

test("13. Existing Video URL or Drive Link must not be cleared", async () => {
  const existing = "https://coach.example/keep-me";
  const base = build022Base({
    preserveVideoUrl: existing,
    assetCells: {
      "Reviewer File URL": "",
      "Canonical File URL": "",
      "Google Drive File URL": "",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(videoRecord(base).getCellValue("Video URL or Drive Link"), existing);
  assert.equal(
    base
      .getTable("Video Feedback")
      .updates.some((u) => u.fields["Video URL or Drive Link"] === ""),
    false
  );
});

test("14. Lambda-uploaded JPEG is accepted as a valid video-feedback asset", async () => {
  const base = build022Base({
    assetCells: {
      "Original File Name": "form-shot.jpg",
      "File MIME Type": "image/jpeg",
      "Reviewer File URL": "https://reviewer.example/jpeg-asset",
      "Canonical File URL": "https://canonical.example/jpeg-asset",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "synced_video");
  assert.equal(output.values.sourceUrlUsed, "Reviewer File URL");
  assert.equal(
    videoRecord(base).getCellValue("Video URL or Drive Link"),
    "https://reviewer.example/jpeg-asset"
  );
  assert.equal(videoRecord(base).getCellValue("Video Asset File Name"), "form-shot.jpg");
  assert.equal(assetCreates(base), 0);
});

test("Homework Completions writeback still syncs Drive fields and Writeback Complete?", async () => {
  const base = build022Base({
    assetCells: {
      "Upload Destination": {
        id: "selHomeworkCompletions",
        name: "Homework Completions",
      },
      "Homework Completions": [{ id: IDS.HOMEWORK, name: "HC-1" }],
      "Video Feedback": [],
      "Reviewer File URL": "",
      "Canonical File URL": "",
    },
  });

  const { output, error } = await run022({ base });
  assert.equal(error, null, error && error.message);
  assert.equal(output.values.statusOut, "success");
  assert.equal(output.values.actionOut, "synced_homework");
  assert.equal(output.values.childTable, "Homework Completions");
  assert.equal(selectName(homeworkRecord(base).getCellValue("Upload Status")), "Uploaded");
  assert.equal(homeworkRecord(base).getCellValue("Writeback Complete?"), true);
  assert.equal(
    homeworkRecord(base).getCellValue("Google Drive File URL"),
    "https://drive.google.com/file/d/driveFile/view"
  );
});

test("Missing required Upload Status option on Video Feedback errors clearly", async () => {
  const base = build022Base({
    videoFieldOpts: {
      statusChoices: ["Pending", "Uploaded"],
    },
    assetCells: {
      "Upload Status": { id: "selProcessing022", name: "Processing" },
    },
  });

  const { output, error } = await run022({ base });
  assert.ok(error);
  assert.match(String(error.message), /Missing required Upload Status option "Processing"/i);
  assert.equal(output.values.statusOut, "error");
  assert.equal(totalChildWrites(base), 0);
});
