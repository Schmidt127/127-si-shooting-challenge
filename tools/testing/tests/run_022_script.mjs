/**
 * Loads and executes the REAL Automation 022 script inside the mock environment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  MockBase,
  MockTable,
  MockRecord,
  MockOutput,
  makeInput,
  makeConsole,
} from "./airtable_mock.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  HERE,
  "../../../airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const IDS = {
  ASSET: "recAsset0220000001",
  HOMEWORK: "recHomework0220001",
  VIDEO: "recVideo0220000001",
  VIDEO_2: "recVideo0220000002",
  HOMEWORK_2: "recHomework0220002",
};

const SELECT_IDS = {
  Uploaded: "selUploaded022",
  Processing: "selProcessing022",
  Error: "selError022",
  "Pending Link": "selPendingLink022",
  Pending: "selPending022",
};

class ResolvingMockTable extends MockTable {
  async updateRecordAsync(recordId, fields) {
    const resolved = {};

    for (const [name, value] of Object.entries(fields || {})) {
      const field = this.fields.find((f) => f.name === name);

      if (
        field?.type === "singleSelect" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value.id
      ) {
        const choice = (field.options?.choices || []).find((c) => c.id === value.id);
        resolved[name] = choice
          ? { id: choice.id, name: choice.name }
          : value;
      } else {
        resolved[name] = value;
      }
    }

    return super.updateRecordAsync(recordId, resolved);
  }
}

function selectChoices(names) {
  return names.map((name) => ({
    id: SELECT_IDS[name] || `sel${name.replace(/\W/g, "")}`,
    name,
  }));
}

function assetsFields() {
  return [
    {
      name: "Upload Destination",
      type: "singleSelect",
      options: {
        choices: selectChoices(["Homework Completions", "Video Feedback"]),
      },
    },
    {
      name: "Upload Status",
      type: "singleSelect",
      options: {
        choices: selectChoices(["Pending Link", "Processing", "Uploaded", "Error"]),
      },
    },
    { name: "Upload Error", type: "multilineText" },
    { name: "Uploaded At", type: "dateTime" },
    { name: "Original File Name", type: "singleLineText" },
    { name: "File MIME Type", type: "singleLineText" },
    { name: "Reviewer File URL", type: "url" },
    { name: "Canonical File URL", type: "url" },
    { name: "Google Drive File URL", type: "url" },
    { name: "Google Drive File ID", type: "singleLineText" },
    { name: "Google Drive Folder ID", type: "singleLineText" },
    { name: "Google Drive Folder URL", type: "url" },
    { name: "Google Drive View URL", type: "url" },
    { name: "Google Drive Download URL", type: "url" },
    { name: "Homework Completions", type: "multipleRecordLinks" },
    { name: "Video Feedback", type: "multipleRecordLinks" },
  ];
}

function homeworkFields() {
  return [
    {
      name: "Upload Status",
      type: "singleSelect",
      options: {
        choices: selectChoices(["Pending", "Processing", "Uploaded", "Error"]),
      },
    },
    { name: "Upload Error", type: "multilineText" },
    { name: "Uploaded At", type: "dateTime" },
    { name: "Google Drive File URL", type: "url" },
    { name: "Google Drive File ID", type: "singleLineText" },
    { name: "Google Drive Folder ID", type: "singleLineText" },
    { name: "Google Drive Folder URL", type: "url" },
    { name: "Writeback Complete?", type: "checkbox" },
  ];
}

function videoFields(extra = {}) {
  const statusChoices = extra.statusChoices || [
    "Pending",
    "Processing",
    "Uploaded",
    "Error",
  ];

  return [
    {
      name: "Upload Status",
      type: "singleSelect",
      options: { choices: selectChoices(statusChoices) },
    },
    { name: "Upload Error", type: "multilineText" },
    { name: "Video URL or Drive Link", type: "url" },
    { name: "Video Asset File Name", type: "singleLineText" },
    { name: "Video Asset Uploaded At", type: "dateTime" },
    { name: "Google Drive File URL", type: "url" },
    { name: "Google Drive File ID", type: "singleLineText" },
    { name: "Google Drive Folder ID", type: "singleLineText" },
    { name: "Google Drive Folder URL", type: "url" },
    { name: "Google Drive View URL", type: "url" },
    { name: "Google Drive Download URL", type: "url" },
  ];
}

function selectCell(name) {
  return { id: SELECT_IDS[name] || `sel${name.replace(/\W/g, "")}`, name };
}

export function build022Base(overrides = {}) {
  const assetCells = {
    "Upload Destination": selectCell("Video Feedback"),
    "Upload Status": selectCell("Uploaded"),
    "Upload Error": "",
    "Uploaded At": "2026-08-16T18:00:00.000Z",
    "Original File Name": "athlete-video.mp4",
    "File MIME Type": "video/mp4",
    "Reviewer File URL": "https://reviewer.example/file?token=abc",
    "Canonical File URL": "https://canonical.example/private/key",
    "Google Drive File URL": "https://drive.google.com/file/d/driveFile/view",
    "Google Drive File ID": "driveFile",
    "Google Drive Folder ID": "driveFolder",
    "Google Drive Folder URL": "https://drive.google.com/drive/folders/driveFolder",
    "Google Drive View URL": "https://drive.google.com/file/d/driveFile/view",
    "Google Drive Download URL": "https://drive.google.com/uc?id=driveFile",
    "Homework Completions": [],
    "Video Feedback": [{ id: IDS.VIDEO, name: "VF-1" }],
    ...(overrides.assetCells || {}),
  };

  const videoCells = {
    "Upload Status": selectCell("Pending"),
    "Upload Error": "",
    "Video URL or Drive Link": overrides.preserveVideoUrl || "",
    "Video Asset File Name": "",
    "Video Asset Uploaded At": null,
    "Google Drive File URL": "",
    "Google Drive File ID": "",
    "Google Drive Folder ID": "",
    "Google Drive Folder URL": "",
    "Google Drive View URL": "",
    "Google Drive Download URL": "",
    ...(overrides.videoCells || {}),
  };

  const homeworkCells = {
    "Upload Status": selectCell("Pending"),
    "Upload Error": "",
    "Uploaded At": null,
    "Google Drive File URL": "",
    "Google Drive File ID": "",
    "Google Drive Folder ID": "",
    "Google Drive Folder URL": "",
    "Writeback Complete?": false,
    ...(overrides.homeworkCells || {}),
  };

  const videoRecords = overrides.videoRecords || [
    new MockRecord(IDS.VIDEO, videoCells),
  ];

  const homeworkRecords = overrides.homeworkRecords || [
    new MockRecord(IDS.HOMEWORK, homeworkCells),
  ];

  const assets = new ResolvingMockTable("Submission Assets", assetsFields(), [
    new MockRecord(IDS.ASSET, assetCells),
  ]);

  const homework = new ResolvingMockTable(
    "Homework Completions",
    homeworkFields(),
    homeworkRecords
  );

  const video = new ResolvingMockTable(
    "Video Feedback",
    videoFields(overrides.videoFieldOpts || {}),
    videoRecords
  );

  return new MockBase([assets, homework, video]);
}

export async function run022({
  base,
  recordId = IDS.ASSET,
} = {}) {
  const scriptSource = readFileSync(SCRIPT_PATH, "utf8");
  const output = new MockOutput();
  const input = makeInput({ recordId });
  const consoleMock = makeConsole();

  const fn = new AsyncFunction(
    "base",
    "input",
    "output",
    "console",
    scriptSource
  );

  let error = null;
  try {
    await fn(base, input, output, consoleMock);
  } catch (err) {
    error = err;
  }

  return { output, error, console: consoleMock, base };
}
