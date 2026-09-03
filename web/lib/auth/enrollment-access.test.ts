import { beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import {
  loadAuthorizedEnrollmentForSession,
  pickPrimaryEnrollment,
  resolveSessionEnrollment,
} from "@/lib/auth/enrollment-access";

const ENROLL_A_ID = "recABCDEFGHIJKLMN";
const ENROLL_B_ID = "recOPQRSTUVWXYab1";

function enrollmentRecord(
  id: string,
  name: string,
  slug: string,
  extras: Record<string, unknown> = {},
) {
  return {
    id,
    fields: {
      "Full Athlete Name": name,
      "Public Profile Slug": slug,
      "School Name Lookup": "Fairfield",
      Grade: "7",
      "Active?": true,
      "Parent Email - Cleaned": "parent@fairfield.k12.mt.us",
      "Lifetime XP Total": 100,
      "XP Progress in Current Level": 10,
      "XP Needed for Next Level": 50,
      "Next Level": "Hot Hand",
      "Current Level - Public Facing Display": "Shooter",
      "Program Instance Name Only": "Shooting Challenge",
      "School Year": "2026-2027",
      ...extras,
    },
  };
}

describe("multi-child enrollment access", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  it("auto-opens the only authorized enrollment", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one")],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID],
      exp: 9_999_999_999,
    });

    expect(result.needsSelection).toBe(false);
    expect(result.active?.enrollmentId).toBe(ENROLL_A_ID);
    expect(result.rejectedUrlEnrollmentId).toBe(false);
  });

  it("requires selection when multiple enrollments and none selected", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one"),
        enrollmentRecord(ENROLL_B_ID, "Blake Two", "blake-two", {
          "School Year": "2025-2026",
        }),
      ],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: null,
      exp: 9_999_999_999,
    });

    expect(result.needsSelection).toBe(true);
    expect(result.active).toBeNull();
    expect(result.enrollments).toHaveLength(2);
    expect(result.enrollments[1]?.seasonLabel).toBe("2025-2026");
  });

  it("uses session selectedEnrollmentId when authorized", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one"),
        enrollmentRecord(ENROLL_B_ID, "Blake Two", "blake-two"),
      ],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: ENROLL_B_ID,
      exp: 9_999_999_999,
    });

    expect(result.needsSelection).toBe(false);
    expect(result.active?.enrollmentId).toBe(ENROLL_B_ID);
  });

  it("ignores URL enrollment ids for authorization", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one"),
        enrollmentRecord(ENROLL_B_ID, "Blake Two", "blake-two"),
      ],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: ENROLL_A_ID,
      exp: 9_999_999_999,
    });

    expect(result.rejectedUrlEnrollmentId).toBe(false);
    expect(result.active?.enrollmentId).toBe(ENROLL_A_ID);
  });

  it("drops enrollments that left the live intersect", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one")],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: ENROLL_B_ID,
      exp: 9_999_999_999,
    });

    expect(result.enrollments).toHaveLength(1);
    expect(result.active?.enrollmentId).toBe(ENROLL_A_ID);
    expect(result.needsSelection).toBe(false);
  });

  it("forces re-selection when selected enrollment is no longer live among multiples", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [
        enrollmentRecord(ENROLL_A_ID, "Alex One", "alex-one"),
        enrollmentRecord(ENROLL_B_ID, "Blake Two", "blake-two"),
      ],
    });

    const result = await loadAuthorizedEnrollmentForSession({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: "recGONE0000000001",
      exp: 9_999_999_999,
    });

    expect(result.needsSelection).toBe(true);
    expect(result.active).toBeNull();
  });

  it("resolveSessionEnrollment never trusts URL enrollment ids", () => {
    const resolved = resolveSessionEnrollment({
      v: 2,
      parentEmail: "parent@fairfield.k12.mt.us",
      enrollmentIds: [ENROLL_A_ID, ENROLL_B_ID],
      selectedEnrollmentId: ENROLL_A_ID,
      exp: 9_999_999_999,
    });
    expect(resolved.enrollment?.enrollmentId).toBe(ENROLL_A_ID);
    expect(resolved.needsSelection).toBe(false);
  });

  it("pickPrimaryEnrollment prefers an authorized id", () => {
    const enrollments = [
      {
        enrollmentId: ENROLL_A_ID,
        displayName: "A",
        slug: "a",
        school: "",
        grade: "",
        level: "",
        programLabel: "",
        seasonLabel: "",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
      {
        enrollmentId: ENROLL_B_ID,
        displayName: "B",
        slug: "b",
        school: "",
        grade: "",
        level: "",
        programLabel: "",
        seasonLabel: "",
        xpTotal: 0,
        xpIntoLevel: 0,
        xpForNextLevel: 0,
        nextLevelLabel: "",
      },
    ];
    expect(pickPrimaryEnrollment(enrollments, ENROLL_B_ID)?.enrollmentId).toBe(ENROLL_B_ID);
  });
});
