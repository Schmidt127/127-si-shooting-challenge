/**
 * Display formatters for XP, dates, athlete names, and streak labels.
 * Add implementations as pages consume live Airtable data.
 */

export function formatXp(points: number): string {
  return new Intl.NumberFormat("en-US").format(points);
}
