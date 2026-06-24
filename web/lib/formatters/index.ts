/**
 * Display formatters for XP, dates, athlete names, and streak labels.
 * Add implementations as pages consume live Airtable data.
 */

export function formatXp(points: number): string {
  return new Intl.NumberFormat("en-US").format(points);
}

export function formatShots(shots: number): string {
  return new Intl.NumberFormat("en-US").format(shots);
}

export function formatGrade(grade: string): string {
  if (!grade || grade === "—") return "—";
  if (grade === "K" || grade === "Pre K") return grade;
  if (/^\d+$/.test(grade)) return `Grade ${grade}`;
  return grade;
}

export function formatRelativeUpdate(iso: string): string {
  const updated = new Date(iso);
  return updated.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
