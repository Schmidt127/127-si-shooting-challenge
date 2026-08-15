/**
 * Shared realistic Airtable classic-REST fixtures for public `/shoot` adapters.
 * Prefer these shapes in tests so display-name-versus-record-id mistakes fail locally.
 */

export const FIXTURE_SCHOOL_YEAR = "2026-2027";
export const FIXTURE_PROGRAM_INSTANCE_ID = "rec5mEM0YPqPqq0hZ";
export const FIXTURE_PROGRAM_INSTANCE_NAME = `Shooting Challenge | ${FIXTURE_SCHOOL_YEAR}`;
export const FIXTURE_LEVEL_2_ID = "recLevel2XXXXXXXXX";
export const FIXTURE_ATHLETE_ID = "recAthleteXXXXXXXX";

export function registeringProgramInstanceFields(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    "Name - Program Instance": FIXTURE_PROGRAM_INSTANCE_NAME,
    "School Year - Linked": FIXTURE_SCHOOL_YEAR,
    "Program - Linked": "Shooting Challenge",
    Status: { id: "selRegistering", name: "Registering", color: "greenBright" },
    "Record Id": FIXTURE_PROGRAM_INSTANCE_ID,
    ...overrides,
  };
}

export function activeLevel2Fields(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    "Level Name": "Level 2",
    "Sort Order": 2,
    "XP Required (Cumulative)": 0,
    "Active?": true,
    ...overrides,
  };
}

/** Enrollment row shaped like live Web - Leaderboard REST. */
export function standingsEnrollmentFields(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    "Active?": true,
    Athlete: [FIXTURE_ATHLETE_ID],
    "Athlete ID Lookup": ["athlete-stable-001"],
    "Program Instance": [FIXTURE_PROGRAM_INSTANCE_ID],
    "Full Athlete Name": "Jordan Athlete",
    "School Name Lookup": ["Test High"],
    Grade: { id: "selGrade8", name: "8", color: "blueLight2" },
    "Current Level": [FIXTURE_LEVEL_2_ID],
    "Current Level - Public Facing Display": "Level 2",
    "Level Sort Order - For Softr": [2],
    "Level Status": { id: "selAssigned", name: "Assigned", color: "greenBright" },
    "Lifetime XP Total": 100,
    "Total Shots Counted": 50,
    "School Year": { id: "selYear", name: FIXTURE_SCHOOL_YEAR, color: "grayLight2" },
    "Public Profile Enabled": false,
    ...overrides,
  };
}
