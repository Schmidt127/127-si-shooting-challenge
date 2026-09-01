import { describe, expect, it } from "vitest";
import {
  applyCollisionSuffix,
  buildMediaBasename,
  buildStorageKeyWithFut007Basename,
  extensionFromFilename,
  formatActivityDateStamp,
  nextCollisionIndex,
  resolveCustomNameSegment,
  resolveMediaCategory,
  sanitizeExtension,
  sanitizeNamePart,
} from "./index";

describe("FUT-007 sanitizeNamePart", () => {
  it("T6: strips punctuation and diacritics", () => {
    expect(sanitizeNamePart("O'Brien", "X")).toBe("OBrien");
    expect(sanitizeNamePart("José", "X")).toBe("Jose");
  });

  it("T4: collapses spaces and hyphens", () => {
    expect(sanitizeNamePart("Off The Dribble", "X")).toBe("OffTheDribble");
    expect(sanitizeNamePart("Free-Throws", "X")).toBe("FreeThrows");
  });

  it("T7: rejects path traversal patterns", () => {
    expect(sanitizeNamePart("../../etc/passwd", "Safe")).toBe("etcpasswd");
  });

  it("uses fallback when empty", () => {
    expect(sanitizeNamePart("  ", "Fallback")).toBe("Fallback");
  });
});

describe("FUT-007 resolveMediaCategory", () => {
  it("T12: maps homework and video destinations", () => {
    expect(resolveMediaCategory({ uploadDestination: "Homework Completions" })).toBe("HW");
    expect(resolveMediaCategory({ uploadDestination: "Video Feedback" })).toBe("VIDEO");
  });

  it("maps registration headshot purpose", () => {
    expect(resolveMediaCategory({ assetPurpose: "Registration Headshot" })).toBe("HEADSHOT");
  });
});

describe("FUT-007 resolveCustomNameSegment", () => {
  it("uses Custom Video File Name for VIDEO", () => {
    expect(
      resolveCustomNameSegment({
        category: "VIDEO",
        customVideoFileName: "OffTheDribble",
      }),
    ).toBe("OffTheDribble");
  });

  it("T5: falls back to focus + sequence", () => {
    expect(
      resolveCustomNameSegment({
        category: "VIDEO",
        videoFeedbackFocus: "Form",
        assetSequence: 2,
      }),
    ).toBe("Form2");
  });

  it("T2: sanitizes homework assignment title", () => {
    expect(
      resolveCustomNameSegment({
        category: "HW",
        homeworkAssignmentName: "Shot Challenge",
      }),
    ).toBe("ShotChallenge");
  });

  it("T3: headshot defaults to Profile", () => {
    expect(resolveCustomNameSegment({ category: "HEADSHOT" })).toBe("Profile");
  });
});

describe("FUT-007 buildMediaBasename", () => {
  it("T1: video with custom name", () => {
    expect(
      buildMediaBasename({
        activityDate: "2026-08-17",
        category: "VIDEO",
        lastName: "Boltz",
        firstName: "Drew",
        customName: "OffTheDribble",
        extension: ".mp4",
      }),
    ).toBe("20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4");
  });

  it("T2: homework assignment basename", () => {
    expect(
      buildMediaBasename({
        activityDate: "2026-08-17",
        category: "HW",
        lastName: "Boltz",
        firstName: "Drew",
        customName: "ShotChallenge",
        extension: ".jpg",
      }),
    ).toBe("20260817_HW_Boltz_Drew_ShotChallenge.jpg");
  });

  it("T3: headshot default Profile", () => {
    expect(
      buildMediaBasename({
        activityDate: "2026-08-17",
        category: "HEADSHOT",
        lastName: "Boltz",
        firstName: "Drew",
        customName: "Profile",
        extension: ".jpg",
      }),
    ).toBe("20260817_HEADSHOT_Boltz_Drew_Profile.jpg");
  });

  it("T10: missing athlete names", () => {
    expect(
      buildMediaBasename({
        activityDate: "2026-08-17",
        category: "VIDEO",
        lastName: "",
        firstName: "",
        customName: "Clip",
        extension: ".mp4",
      }),
    ).toBe("20260817_VIDEO_UnknownAthlete_UnknownAthlete_Clip.mp4");
  });
});

describe("FUT-007 collision handling", () => {
  it("T8: applies _2 suffix", () => {
    const base = "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";
    expect(applyCollisionSuffix(base, 2)).toBe(
      "20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4",
    );
  });

  it("nextCollisionIndex finds free slot", () => {
    const candidate = "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4";
    const existing = [candidate, "20260817_VIDEO_Boltz_Drew_OffTheDribble_2.mp4"];
    expect(nextCollisionIndex(candidate, existing)).toBe(3);
  });

  it("T9: collision index 1 leaves basename unchanged", () => {
    const base = "20260817_HW_Boltz_Drew_ShotChallenge.jpg";
    expect(applyCollisionSuffix(base, 1)).toBe(base);
  });
});

describe("FUT-007 storage key helper", () => {
  it("composes folder prefix + basename", () => {
    expect(
      buildStorageKeyWithFut007Basename({
        athleteFolder: "Boltz_Drew",
        programInstanceFolder: "Shooting_Challenge_2026-2027",
        activityDateFolder: "2026-08-17",
        basename: "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",
      }),
    ).toBe(
      "Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",
    );
  });
});

describe("FUT-007 utilities", () => {
  it("formatActivityDateStamp accepts YYYY-MM-DD", () => {
    expect(formatActivityDateStamp("2026-08-17")).toBe("20260817");
  });

  it("extensionFromFilename extracts extension", () => {
    expect(extensionFromFilename("folder/clip.MP4")).toBe(".mp4");
  });

  it("sanitizeExtension defaults to .bin", () => {
    expect(sanitizeExtension("")).toBe(".bin");
  });
});
