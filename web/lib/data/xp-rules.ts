import { asBoolean, asNumber, asText } from "./airtable-values";

/**
 * XP Reward Rules — live configuration catalog for the public game manual.
 *
 * The Airtable `XP Reward Rules` table is the runtime authority for XP amounts
 * (see docs/overnight/config-xp/xp-reward-rules-prod-live.json). The website
 * renders whatever is configured; it never hardcodes rule economics.
 */

export type XpRewardRuleFields = {
  "Reward Rule"?: unknown;
  "Rule Key"?: unknown;
  "XP Source Label"?: unknown;
  "XP Amount"?: unknown;
  "Active?"?: unknown;
  "Rule Set"?: unknown;
  "Sort Order"?: unknown;
  Notes?: unknown;
  "Grade Band"?: unknown;
};

export type XpRewardRule = {
  id: string;
  ruleKey: string;
  label: string;
  amount: number;
  active: boolean;
  ruleSet: string;
  sortOrder: number | null;
};

export type XpRuleGroupId =
  | "shooting"
  | "weekly-thresholds"
  | "streaks"
  | "homework"
  | "video"
  | "zoom"
  | "perfect-week"
  | "other";

export type XpRuleGroup = {
  id: XpRuleGroupId;
  title: string;
  description: string;
  rules: XpRewardRule[];
};

export type XpRuleCatalogData = {
  groups: XpRuleGroup[];
  totalActiveRules: number;
  updatedAt: string;
};

const GROUP_ORDER: Array<Omit<XpRuleGroup, "rules">> = [
  {
    id: "shooting",
    title: "Daily shooting",
    description: "Base XP for logging shooting sessions.",
  },
  {
    id: "weekly-thresholds",
    title: "Weekly shot thresholds",
    description: "Bonus XP when weekly shot totals reach configured thresholds for your grade band.",
  },
  {
    id: "streaks",
    title: "Streaks",
    description: "Bonus XP for consecutive days logged.",
  },
  {
    id: "homework",
    title: "Homework",
    description: "XP after a coach marks a homework completion satisfactory.",
  },
  {
    id: "video",
    title: "Video submissions",
    description: "XP for submitting form videos for coach feedback.",
  },
  {
    id: "zoom",
    title: "Zoom meetings",
    description: "XP for attending live Zoom meetings (or approved recording credit).",
  },
  {
    id: "perfect-week",
    title: "Perfect Week",
    description: "Bonus XP for completing every required activity in a week.",
  },
  {
    id: "other",
    title: "Other rewards",
    description: "Additional configured XP sources.",
  },
];

export function mapXpRuleRecord(record: {
  id: string;
  fields: XpRewardRuleFields;
}): XpRewardRule {
  const fields = record.fields;
  const label =
    asText(fields["XP Source Label"], "") ||
    asText(fields["Reward Rule"], "") ||
    asText(fields["Rule Key"], "XP Reward");
  const rawSort = fields["Sort Order"];

  return {
    id: record.id,
    ruleKey: asText(fields["Rule Key"], "").toUpperCase(),
    label,
    amount: asNumber(fields["XP Amount"]),
    active: asBoolean(fields["Active?"]),
    ruleSet: asText(fields["Rule Set"], ""),
    sortOrder: rawSort == null || rawSort === "" ? null : asNumber(rawSort),
  };
}

export function classifyXpRule(rule: XpRewardRule): XpRuleGroupId {
  const key = rule.ruleKey;
  if (key.startsWith("STREAK")) return "streaks";
  if (key.startsWith("WEEKLY_THRESHOLD")) return "weekly-thresholds";
  if (key.startsWith("HOMEWORK")) return "homework";
  if (key.startsWith("VIDEO")) return "video";
  if (key.startsWith("ZOOM")) return "zoom";
  if (key.startsWith("PERFECT_WEEK")) return "perfect-week";
  if (key.startsWith("SHOOTING")) return "shooting";
  return "other";
}

function compareRules(a: XpRewardRule, b: XpRewardRule): number {
  const aSort = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (aSort !== bSort) return aSort - bSort;
  if (a.amount !== b.amount) return a.amount - b.amount;
  const byLabel = a.label.localeCompare(b.label);
  if (byLabel !== 0) return byLabel;
  return a.ruleKey.localeCompare(b.ruleKey);
}

/**
 * Weekly threshold rules repeat once per grade band with the same public label
 * and amount (e.g. `WEEKLY_THRESHOLD_100_K2` … `_912`). Collapse those into a
 * single display row so the manual reads cleanly.
 */
export function dedupeByLabelAndAmount(rules: XpRewardRule[]): XpRewardRule[] {
  const seen = new Set<string>();
  const result: XpRewardRule[] = [];
  for (const rule of rules) {
    const key = `${rule.label.toLowerCase()}|${rule.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(rule);
  }
  return result;
}

export function buildXpRuleCatalog(
  records: Array<{ id: string; fields: XpRewardRuleFields }>,
): XpRuleCatalogData {
  const active = records.map(mapXpRuleRecord).filter((rule) => rule.active);

  const byGroup = new Map<XpRuleGroupId, XpRewardRule[]>();
  for (const rule of active) {
    const groupId = classifyXpRule(rule);
    const bucket = byGroup.get(groupId) ?? [];
    bucket.push(rule);
    byGroup.set(groupId, bucket);
  }

  const groups: XpRuleGroup[] = [];
  for (const groupDef of GROUP_ORDER) {
    const rules = (byGroup.get(groupDef.id) ?? []).sort(compareRules);
    if (rules.length === 0) continue;
    const displayRules =
      groupDef.id === "weekly-thresholds" || groupDef.id === "other"
        ? dedupeByLabelAndAmount(rules)
        : rules;
    groups.push({ ...groupDef, rules: displayRules });
  }

  return {
    groups,
    totalActiveRules: active.length,
    updatedAt: new Date().toISOString(),
  };
}
