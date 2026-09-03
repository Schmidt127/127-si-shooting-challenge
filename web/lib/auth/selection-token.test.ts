import { describe, expect, it } from "vitest";

import {
  mintEnrollmentSelectionKey,
  resolveEnrollmentIdFromSelectionKey,
} from "@/lib/auth/selection-token";

const SECRET = "unit-test-secret-at-least-32-characters";
const PARENT = "parent@fairfield.k12.mt.us";
const ENROLL_A = "recABCDEFGHIJKLMN";
const ENROLL_B = "recOPQRSTUVWXYab1";

describe("enrollment selection keys", () => {
  it("mints opaque keys that never contain Airtable record ids", () => {
    const key = mintEnrollmentSelectionKey(ENROLL_A, PARENT, SECRET);
    expect(key).not.toMatch(/rec[a-zA-Z0-9]{14}/);
    expect(key).not.toContain(ENROLL_A);
    expect(key.length).toBeGreaterThan(20);
  });

  it("resolves keys only within the authorized enrollment set", () => {
    const key = mintEnrollmentSelectionKey(ENROLL_A, PARENT, SECRET);
    expect(
      resolveEnrollmentIdFromSelectionKey(key, PARENT, [ENROLL_A, ENROLL_B], SECRET),
    ).toBe(ENROLL_A);
    expect(
      resolveEnrollmentIdFromSelectionKey(key, PARENT, [ENROLL_B], SECRET),
    ).toBeNull();
  });

  it("rejects forged or wrong-parent keys", () => {
    const key = mintEnrollmentSelectionKey(ENROLL_A, PARENT, SECRET);
    expect(
      resolveEnrollmentIdFromSelectionKey(key, "other@fairfield.k12.mt.us", [ENROLL_A], SECRET),
    ).toBeNull();
    expect(
      resolveEnrollmentIdFromSelectionKey("forged-token-value", PARENT, [ENROLL_A], SECRET),
    ).toBeNull();
    expect(
      resolveEnrollmentIdFromSelectionKey(ENROLL_A, PARENT, [ENROLL_A], SECRET),
    ).toBeNull();
  });

  it("is stable for the same parent + enrollment + secret", () => {
    expect(mintEnrollmentSelectionKey(ENROLL_A, PARENT, SECRET)).toBe(
      mintEnrollmentSelectionKey(ENROLL_A, " Parent@Fairfield.K12.mt.us ", SECRET),
    );
  });
});
