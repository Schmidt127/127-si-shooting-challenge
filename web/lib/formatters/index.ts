/**
 * Display formatters for XP, dates, athlete names, and streak labels.
 * Add implementations as pages consume live Airtable data.
 */

import type { XpSourceLabel } from "@/types/xp";
import {
  formatMontanaDateTime,
  MONTANA_TIME_ZONE_LABEL,
} from "@/lib/formatters/montana-time";

export function formatXp(points: number): string {
  if (!Number.isFinite(points)) return "0";
  return new Intl.NumberFormat("en-US").format(points);
}

export function formatShots(shots: number): string {
  if (!Number.isFinite(shots)) return "0";
  return new Intl.NumberFormat("en-US").format(shots);
}

export function formatGrade(grade: string): string {
  if (!grade || grade === "—") return "—";
  if (grade === "K" || grade === "Pre K") return grade;
  if (/^\d+$/.test(grade)) return `Grade ${grade}`;
  return grade;
}

/**
 * Map raw / legacy XP Source strings to the V2 public labels used by automations.
 * Unknown values pass through trimmed; empty → "XP".
 */
export function formatXpSourceLabel(source: string | null | undefined): string {
  const raw = String(source ?? "").trim();
  if (!raw) return "XP";

  const aliases: Record<string, XpSourceLabel> = {
    submission: "Submission Base",
    "submission base": "Submission Base",
    homework: "Homework Completion",
    "homework completion": "Homework Completion",
    "video feedback": "Video Submission",
    "video submission": "Video Submission",
    streak: "Streak",
    "perfect week": "Perfect Week",
    "shot milestone": "Shot Milestone",
    "zoom attendance": "Zoom Attendance: Base",
    "zoom attendance: base": "Zoom Attendance: Base",
    "zoom recording": "Zoom Recording",
    achievement: "Achievement",
  };

  return aliases[raw.toLowerCase()] ?? raw;
}

/** Public "Updated …" stamps in America/Denver with a fixed MT label. */
export function formatRelativeUpdate(iso: string | null | undefined): string {
  const formatted = formatMontanaDateTime(iso, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatted ?? "Updated recently";
}

/** Zoom / meeting datetime labels in America/Denver with a fixed MT label. */
export function formatMeetingDateTime(iso: string | null): string {
  const formatted = formatMontanaDateTime(iso, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatted ?? "Date TBD";
}

export { MONTANA_TIME_ZONE_LABEL };
