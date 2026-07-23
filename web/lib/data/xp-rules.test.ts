import { describe, expect, it } from "vitest";

import {
  buildXpRuleCatalog,
  classifyXpRule,
  dedupeByLabelAndAmount,
  mapXpRuleRecord,
  type XpRewardRuleFields,
} from "./xp-rules";

function record(
  id: string,
  fields: XpRewardRuleFields,
): { id: string; fields: XpRewardRuleFields } {
  return { id, fields };
}

/** Shapes mirror docs/overnight/config-xp/xp-reward-rules-prod-live.json (PROD). */
const PROD_LIKE_RECORDS = [
  record("rec1", {
    "Rule Key": "SHOOTING_BASE",
    "XP Source Label": "Shooting Base",
    "XP Amount": 20,
    "Active?": true,
  }),
  record("rec2", {
    "Rule Key": "STREAK_3DAY",
    "XP Source Label": "3-Day Streak",
    "XP Amount": 10,
    "Active?": true,
  }),
  record("rec3", {
    "Rule Key": "STREAK_10DAY",
    "XP Source Label": "10-Day Streak",
    "XP Amount": 30,
    "Active?": true,
  }),
  record("rec4", {
    "Rule Key": "PERFECT_WEEK",
    "XP Source Label": "Perfect Week",
    "XP Amount": 100,
    "Active?": true,
  }),
  record("rec5", {
    "Rule Key": "HOMEWORK_COMPLETION",
    "XP Source Label": "Homework Completion",
    "XP Amount": 35,
    "Active?": true,
  }),
  record("rec6", {
    "Rule Key": "VIDEO_SUBMISSION",
    "XP Source Label": "Video Submission",
    "XP Amount": 25,
    "Active?": true,
  }),
  record("rec7", {
    "Rule Key": "ZOOM_ATTEND_BASE",
    "XP Source Label": "Zoom Meeting Attendance Base",
    "XP Amount": 60,
    "Active?": true,
  }),
  record("rec8", {
    "Rule Key": "WEEKLY_THRESHOLD_100_K2",
    "XP Source Label": "Weekly Threshold 100",
    "XP Amount": 10,
    "Active?": true,
  }),
  record("rec9", {
    "Rule Key": "WEEKLY_THRESHOLD_100_34",
    "XP Source Label": "Weekly Threshold 100",
    "XP Amount": 10,
    "Active?": true,
  }),
  record("rec10", {
    "Rule Key": "WEEKLY_THRESHOLD_125_K2",
    "XP Source Label": "Weekly Threshold 125",
    "XP Amount": 20,
    "Active?": true,
  }),
];

describe("mapXpRuleRecord", () => {
  it("maps configured fields and normalizes the rule key", () => {
    const rule = mapXpRuleRecord(
      record("recA", {
        "Rule Key": "streak_5day",
        "XP Source Label": "5-Day Streak",
        "XP Amount": 15,
        "Active?": true,
        "Sort Order": 3,
      }),
    );

    expect(rule).toMatchObject({
      id: "recA",
      ruleKey: "STREAK_5DAY",
      label: "5-Day Streak",
      amount: 15,
      active: true,
      sortOrder: 3,
    });
  });

  it("survives malformed records without throwing", () => {
    const rule = mapXpRuleRecord(
      record("recBad", {
        "Rule Key": null,
        "XP Amount": "not-a-number",
        "Active?": "yes?",
      }),
    );

    expect(rule.label).toBe("XP Reward");
    expect(rule.amount).toBe(0);
    expect(rule.active).toBe(false);
    expect(rule.sortOrder).toBeNull();
  });

  it("falls back to Reward Rule name when label missing", () => {
    const rule = mapXpRuleRecord(
      record("recB", {
        "Reward Rule": "Some Named Rule",
        "Rule Key": "CUSTOM_RULE",
        "XP Amount": 5,
        "Active?": true,
      }),
    );
    expect(rule.label).toBe("Some Named Rule");
  });
});

describe("classifyXpRule", () => {
  it.each([
    ["STREAK_30DAY", "streaks"],
    ["WEEKLY_THRESHOLD_150_912", "weekly-thresholds"],
    ["HOMEWORK_COMPLETION", "homework"],
    ["VIDEO_SUBMISSION", "video"],
    ["ZOOM_ATTEND_BONUS_2", "zoom"],
    ["PERFECT_WEEK", "perfect-week"],
    ["SHOOTING_BASE", "shooting"],
    ["SOMETHING_ELSE", "other"],
  ])("classifies %s as %s", (key, expected) => {
    const rule = mapXpRuleRecord(
      record("recX", { "Rule Key": key, "XP Amount": 1, "Active?": true }),
    );
    expect(classifyXpRule(rule)).toBe(expected);
  });
});

describe("buildXpRuleCatalog", () => {
  it("groups PROD-like rules and counts all active rules", () => {
    const catalog = buildXpRuleCatalog(PROD_LIKE_RECORDS);

    expect(catalog.totalActiveRules).toBe(10);
    expect(catalog.groups.map((group) => group.id)).toEqual([
      "shooting",
      "weekly-thresholds",
      "streaks",
      "homework",
      "video",
      "zoom",
      "perfect-week",
    ]);
  });

  it("filters inactive rules", () => {
    const catalog = buildXpRuleCatalog([
      ...PROD_LIKE_RECORDS,
      record("recOff", {
        "Rule Key": "STREAK_99DAY",
        "XP Source Label": "Disabled Streak",
        "XP Amount": 999,
        "Active?": false,
      }),
    ]);

    const streaks = catalog.groups.find((group) => group.id === "streaks");
    expect(streaks?.rules.some((rule) => rule.ruleKey === "STREAK_99DAY")).toBe(false);
    expect(catalog.totalActiveRules).toBe(10);
  });

  it("collapses per-grade-band weekly threshold duplicates for display", () => {
    const catalog = buildXpRuleCatalog(PROD_LIKE_RECORDS);
    const thresholds = catalog.groups.find((group) => group.id === "weekly-thresholds");

    expect(thresholds?.rules.map((rule) => rule.label)).toEqual([
      "Weekly Threshold 100",
      "Weekly Threshold 125",
    ]);
  });

  it("sorts streak rules by amount when sort order is missing", () => {
    const catalog = buildXpRuleCatalog(PROD_LIKE_RECORDS);
    const streaks = catalog.groups.find((group) => group.id === "streaks");

    expect(streaks?.rules.map((rule) => rule.amount)).toEqual([10, 30]);
  });

  it("returns an empty catalog for an empty base without throwing", () => {
    const catalog = buildXpRuleCatalog([]);
    expect(catalog.groups).toEqual([]);
    expect(catalog.totalActiveRules).toBe(0);
  });
});

describe("dedupeByLabelAndAmount", () => {
  it("keeps distinct amounts under the same label", () => {
    const rules = [
      mapXpRuleRecord(
        record("r1", { "Rule Key": "A", "XP Source Label": "Bonus", "XP Amount": 10, "Active?": true }),
      ),
      mapXpRuleRecord(
        record("r2", { "Rule Key": "B", "XP Source Label": "Bonus", "XP Amount": 20, "Active?": true }),
      ),
    ];
    expect(dedupeByLabelAndAmount(rules)).toHaveLength(2);
  });
});
