/**
 * Deterministic current shooting streak from counted submission Activity Dates.
 * Mirrors Automation 055 anchor logic for parent-facing Daily Submission email.
 *
 * @typedef {object} ComputeCurrentShootingStreakOptions
 * @property {Set<string>|string[]} countedActivityDateKeys - YYYY-MM-DD keys for counted days
 * @property {string} [todayDateKey] - America/Denver today (YYYY-MM-DD)
 * @property {string} [yesterdayDateKey] - America/Denver yesterday (YYYY-MM-DD)
 */

const DEFAULT_TIME_ZONE = "America/Denver";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getTodayDateKey(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not determine today's date key.");
  }

  return `${year}-${month}-${day}`;
}

function subtractOneDayFromDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map((value) => Number(value));

  if (!year || !month || !day) return "";

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function findMostRecentDateKey(dateKeys) {
  const sorted = [...dateKeys].sort();
  return sorted.length ? sorted[sorted.length - 1] : "";
}

function calculateStreakEndingAt(dateKeys, anchorDateKey) {
  const keySet = dateKeys instanceof Set ? dateKeys : new Set(dateKeys);
  if (!anchorDateKey || !keySet.has(anchorDateKey)) {
    return 0;
  }

  let streak = 0;
  let currentDateKey = anchorDateKey;

  while (keySet.has(currentDateKey)) {
    streak += 1;
    currentDateKey = subtractOneDayFromDateKey(currentDateKey);
  }

  return streak;
}

/**
 * Parse an Activity Date cell to a YYYY-MM-DD key without timezone shifting.
 * @param {unknown} value
 * @returns {string}
 */
function activityDateToDateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${pad2(Number(slashMatch[1]))}-${pad2(Number(slashMatch[2]))}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
  }

  return "";
}

/**
 * Compute the active current shooting streak for Daily Submission email display.
 * Uses counted submission dates only — never Enrollment Longest Streak Days.
 *
 * @param {ComputeCurrentShootingStreakOptions} options
 * @returns {number}
 */
function computeCurrentShootingStreakForEmail(options = {}) {
  const rawKeys = options.countedActivityDateKeys;
  const dateKeys = rawKeys instanceof Set ? rawKeys : new Set(rawKeys || []);
  const todayKey = options.todayDateKey || getTodayDateKey();
  const yesterdayKey = options.yesterdayDateKey || subtractOneDayFromDateKey(todayKey);
  const mostRecentDateKey = findMostRecentDateKey(dateKeys);

  if (!mostRecentDateKey) {
    return 0;
  }

  const streakIsStillCurrent =
    mostRecentDateKey === todayKey ||
    mostRecentDateKey === yesterdayKey ||
    mostRecentDateKey > todayKey;

  if (!streakIsStillCurrent) {
    return 0;
  }

  return calculateStreakEndingAt(dateKeys, mostRecentDateKey);
}

module.exports = {
  DEFAULT_TIME_ZONE,
  activityDateToDateKey,
  calculateStreakEndingAt,
  computeCurrentShootingStreakForEmail,
  findMostRecentDateKey,
  getTodayDateKey,
  subtractOneDayFromDateKey,
};
