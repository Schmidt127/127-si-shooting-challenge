import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listAirtableRecordsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/airtable/client", () => ({
  listAirtableRecords: listAirtableRecordsMock,
}));

import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import type { AthleteSessionPayload } from "@/lib/auth/session";

const PARENT = "parent@fairfield.k12.mt.us";
const ID_A = "recABCDEFGHIJKLMN";
const ID_B = "recNOPQRSTUVWXYZA";
const ID_INACTIVE = "recINACTIVE000001";
const ID_GONE = "recGONE0000000001";

function record(id: string, name: string) {
  return {
    id,
    fields: {
      "Full Athlete Name": name,
      "Public Profile Slug": name.toLowerCase().replace(/\s+/g, "-"),
      "School Name Lookup": "Fairfield",
      Grade: "7",
      "Active?": true,
      "Parent Email - Cleaned": PARENT,
      "Lifetime XP Total": "10",
      "XP Progress in Current Level": "1",
      "XP Needed for Next Level": "50",
      "Next Level": "Hot Hand",
      "Current Level - Public Facing Display": "Shooter",
      "Program Instance Name Only": "Shooting Challenge",
      "School Year": "2026-2027",
    },
  };
}

describe("loadAuthorizedEnrollmentForSession", () => {
  beforeEach(() => {
    listAirtableRecordsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("auto-selects the only authorized enrollment", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [record(ID_A, "Only Child")],
    });

    const session: AthleteSessionPayload = {
      v: 2,
      parentEmail: PARENT,
      enrollmentIds: [ID_A],
      selectedEnrollmentId: null,
      exp: 9_999_999_999,
    };

    const result = await loadAuthorizedEnrollmentForSession(session);
    expect(result.needsSelection).toBe(false);
    expect(result.active?.enrollmentId).toBe(ID_A);
  });

  it("requires selection when multiple children and none selected", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [record(ID_A, "Child A"), record(ID_B, "Child B")],
    });

    const session: AthleteSessionPayload = {
      v: 2,
      parentEmail: PARENT,
      enrollmentIds: [ID_A, ID_B],
      selectedEnrollmentId: null,
      exp: 9_999_999_999,
    };

    const result = await loadAuthorizedEnrollmentForSession(session);
    expect(result.needsSelection).toBe(true);
    expect(result.active).toBeNull();
    expect(result.enrollments).toHaveLength(2);
  });

  it("honors a valid selectedEnrollmentId", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [record(ID_A, "Child A"), record(ID_B, "Child B")],
    });

    const session: AthleteSessionPayload = {
      v: 2,
      parentEmail: PARENT,
      enrollmentIds: [ID_A, ID_B],
      selectedEnrollmentId: ID_B,
      exp: 9_999_999_999,
    };

    const result = await loadAuthorizedEnrollmentForSession(session);
    expect(result.needsSelection).toBe(false);
    expect(result.active?.displayName).toBe("Child B");
  });

  it("drops inactive or email-mismatched session ids via live intersect", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [record(ID_A, "Still Active")],
    });

    const session: AthleteSessionPayload = {
      v: 2,
      parentEmail: PARENT,
      enrollmentIds: [ID_A, ID_INACTIVE],
      selectedEnrollmentId: ID_INACTIVE,
      exp: 9_999_999_999,
    };

    const result = await loadAuthorizedEnrollmentForSession(session);
    expect(result.liveEnrollmentIds).toEqual([ID_A]);
    expect(result.needsSelection).toBe(false);
    expect(result.active?.enrollmentId).toBe(ID_A);
  });

  it("forces re-select when selected id is no longer authorized", async () => {
    listAirtableRecordsMock.mockResolvedValue({
      records: [record(ID_A, "Child A"), record(ID_B, "Child B")],
    });

    const session: AthleteSessionPayload = {
      v: 2,
      parentEmail: PARENT,
      enrollmentIds: [ID_A, ID_B],
      selectedEnrollmentId: ID_GONE,
      exp: 9_999_999_999,
    };

    const result = await loadAuthorizedEnrollmentForSession(session);
    expect(result.needsSelection).toBe(true);
    expect(result.active).toBeNull();
  });
});
