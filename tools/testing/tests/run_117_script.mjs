/**
 * Loads and executes the REAL Stage 17 orchestrator (Automation 117,
 * airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js)
 * inside the offline mock environment. No alternative implementation — the
 * production .js file is evaluated as-is.
 *
 * Overnight zoom/storage run (WP-C fixtures).
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
  "../../../airtable/automations/shooting-challenge/117-zoom-recording-credit-orchestrator.js"
);

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export const IDS = {
  ENROLLMENT: "recgP9qZYjAhE7NXm", // Schmidt test enrollment (PROD-safe fixture id)
  MEETING: "recZmMeeting000001",
  ZA: "recZaRecording0001",
  WEEK: "recWeek00000000003",
};

export const CREDIT_KEY = `ZOOM_CREDIT|${IDS.ENROLLMENT}|${IDS.MEETING}`;

/**
 * Build PROD-shaped mock tables for the 117 orchestrator.
 * Field names follow the 2026-07-23 post-TS PROD schema snapshot.
 */
export function buildZoomBase({ zaCells = {}, xpRecords = [], meetingCells = {} } = {}) {
  const reviewChoices = ["Needs Review", "Satisfactory", "Needs Correction"].map((name, i) => ({
    id: `selReview${i}`,
    name,
  }));
  const methodChoices = ["Live", "Recording Quiz"].map((name, i) => ({
    id: `selMethod${i}`,
    name,
  }));

  const zoomAttendance = new MockTable(
    "Zoom Attendance",
    [
      { name: "Attendance Method", type: "singleSelect", options: { choices: methodChoices } },
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "Zoom Meeting", type: "multipleRecordLinks" },
      { name: "Enrollment RID", type: "formula", isComputed: true },
      { name: "Zoom Meeting RID", type: "formula", isComputed: true },
      {
        name: "Recording Quiz Review Status",
        type: "singleSelect",
        options: { choices: reviewChoices },
      },
      { name: "Recording Quiz Satisfactory?", type: "checkbox" },
      { name: "Recording Quiz Submitted At", type: "dateTime" },
      { name: "Recording Quiz Correction Count", type: "number" },
      { name: "Recording Quiz Reviewed At", type: "dateTime" },
      { name: "Recording Quiz Needs Correction At", type: "dateTime" },
      { name: "Zoom Credit Key", type: "formula", isComputed: true },
      { name: "Zoom Credit Approved?", type: "formula", isComputed: true },
      { name: "Zoom Credit Conflict?", type: "formula", isComputed: true },
      { name: "Zoom XP Amount", type: "formula", isComputed: true },
      { name: "Zoom Credit Debug", type: "formula", isComputed: true },
      { name: "Zoom Gate Credit Earned?", type: "formula", isComputed: true },
      { name: "Gate Credit Applied?", type: "checkbox" },
      { name: "Effective Recording Counts for Perfect Week?", type: "formula", isComputed: true },
      { name: "Perfect Week Credit Applied?", type: "checkbox" },
      { name: "Recording Approval Email Send Key", type: "singleLineText" },
      { name: "Recording Approval Email Sent At", type: "dateTime" },
    ],
    [
      new MockRecord(IDS.ZA, {
        "Attendance Method": "Recording Quiz",
        Enrollment: [{ id: IDS.ENROLLMENT, name: "Schmidt, Testing" }],
        "Zoom Meeting": [{ id: IDS.MEETING, name: "Zoom 2026-07-15" }],
        "Enrollment RID": IDS.ENROLLMENT,
        "Zoom Meeting RID": IDS.MEETING,
        "Zoom Credit Key": CREDIT_KEY,
        "Zoom Credit Approved?": 1,
        "Zoom Credit Conflict?": 0,
        "Zoom XP Amount": 25,
        "Zoom Gate Credit Earned?": 1,
        "Effective Recording Counts for Perfect Week?": 1,
        "Recording Quiz Review Status": "Satisfactory",
        "Recording Quiz Satisfactory?": true,
        "Recording Quiz Submitted At": "2026-07-16T02:00:00.000Z",
        ...zaCells,
      }),
    ]
  );

  const zoomMeetings = new MockTable(
    "Zoom Meetings",
    [
      { name: "Start Time", type: "dateTime" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Attendees", type: "multipleRecordLinks" },
    ],
    [
      new MockRecord(IDS.MEETING, {
        "Start Time": "2026-07-15T18:00:00.000Z",
        Week: [{ id: IDS.WEEK, name: "Week 3" }],
        Attendees: null,
        ...meetingCells,
      }),
    ]
  );

  const xpBucketChoices = [
    { id: "selBucketZoom", name: "Zoom Attendance" },
    { id: "selBucketVideo", name: "Video Feedback" },
  ];
  const xpSourceChoices = [
    { id: "selSrcRecQuiz", name: "Zoom Meeting Recording Quiz" },
    { id: "selSrcLive", name: "Zoom Meeting Attendance" },
  ];

  const xpEvents = new MockTable(
    "XP Events",
    [
      { name: "Source Key", type: "singleLineText" },
      { name: "Enrollment", type: "multipleRecordLinks" },
      { name: "XP Points", type: "number" },
      { name: "XP Bucket", type: "singleSelect", options: { choices: xpBucketChoices } },
      { name: "XP Source", type: "singleSelect", options: { choices: xpSourceChoices } },
      { name: "Active?", type: "checkbox" },
      { name: "XP Reason Public", type: "singleLineText" },
      { name: "XP Reason Debug", type: "multilineText" },
      { name: "XP Activity Date", type: "date" },
      { name: "Zoom Meeting", type: "multipleRecordLinks" },
      { name: "Zoom Attendance", type: "multipleRecordLinks" },
      { name: "Week", type: "multipleRecordLinks" },
      { name: "Awarded By", type: "singleLineText" },
    ],
    xpRecords
  );

  return new MockBase([zoomAttendance, zoomMeetings, xpEvents]);
}

/** Execute the real 117 script. Returns { output, console, error, base }. */
export async function run117({ base, recordId = IDS.ZA, dryRun = undefined } = {}) {
  const code = readFileSync(SCRIPT_PATH, "utf-8");
  const output = new MockOutput();
  const capturedConsole = makeConsole();
  const config = { recordId };
  if (dryRun !== undefined) config.dryRun = dryRun;
  const input = makeInput(config);
  const fn = new AsyncFunction("base", "input", "output", "console", code);
  let error = null;
  try {
    await fn(base, input, output, capturedConsole);
  } catch (e) {
    error = e;
  }
  return { output, console: capturedConsole, error, base };
}
